import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ingredient } from '../database/entities';
import { AgentsService } from '../agents/agents.service';
import { NormalizeForMatch, ComputeNameSimilarity, Singularize } from '../ingredients/helper/normalize';

@Injectable()
export class IngredientsService implements OnModuleInit {
  private readonly logger = new Logger(IngredientsService.name);

  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepo: Repository<Ingredient>,
    private readonly agentsService: AgentsService,
  ) { }

  async onModuleInit() {
    try {
      const res = await this.ingredientRepo.query(
        `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS enabled`,
      );
      const enabled = Boolean(res?.[0]?.enabled);
      if (!enabled) {
        this.logger.warn('pg_trgm extension is not enabled; fuzzy ingredient search will degrade to basic ILIKE');
      }
    } catch (err) {
      this.logger.warn(`Unable to check pg_trgm extension: ${(err as Error).message}`);
    }
  }

  findAll() {
    return this.ingredientRepo.find();
  }

  findByIds(ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.ingredientRepo.findBy({ id: In(ids) });
  }

  async findByNameCaseInsensitive(name: string) {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    return this.ingredientRepo
      .createQueryBuilder('ingredient')
      .where('LOWER(ingredient.name) = LOWER(:name)', { name: trimmed })
      .getOne();
  }

  findById(id: string) {
    if (!id) return Promise.resolve(null);
    return this.ingredientRepo.findOne({ where: { id } });
  }

async findOrCreateByName(name: string): Promise<Ingredient> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Ingredient name is empty');
  }

  const normalized = NormalizeForMatch(trimmed);

  // --- 0) Special-case tiny / ambiguous ingredients ------------------

  // Plain water → force a 0-kcal ingredient instead of tuna-in-water
  if (normalized === 'water') {
    return this.getOrCreateZeroMacroIngredient('Water');
  }

  // Salt & pepper combo – treat as negligible seasoning
  if (
    normalized === 'salt and black pepper' ||
    normalized === 'salt black pepper' ||
    normalized === 'salt pepper'
  ) {
    return this.getOrCreateZeroMacroIngredient('Salt and black pepper');
  }

  // --- 1) Exact name match first -------------------------------------

  let ingredient = await this.ingredientRepo.findOne({
    where: { name: trimmed },
  });

  if (ingredient) {
    this.logger.log(
      `Matched LLM ingredient "${trimmed}" exactly by name -> "${ingredient.name}"`,
    );
    return ingredient;
  }

  // --- 2) Exact similarity_name match --------------------------------

  ingredient = await this.ingredientRepo.findOne({
    where: { similarity_name: normalized },
  });

  if (ingredient) {
    this.logger.log(
      `Matched LLM ingredient "${trimmed}" exactly by similarity_name -> "${ingredient.name}"`,
    );
    return ingredient;
  }

  // --- 3) Build search tokens (most specific → generic) --------------

  const tokens = normalized.split(' ').filter(Boolean); // ["boneless","skinless","chicken","breast"]

  const searchTokens: string[] = [];

  if (tokens.length > 0) {
    const last = Singularize(tokens[tokens.length - 1]);
    if (last) searchTokens.push(last);
  }

  if (tokens.length > 1) {
    const first = Singularize(tokens[0]);
    if (first && !searchTokens.includes(first)) {
      searchTokens.push(first);
    }
  }

  if (normalized && !searchTokens.includes(normalized)) {
    searchTokens.push(normalized);
  }

  this.logger.debug(
    `findOrCreateByName("${trimmed}") normalized="${normalized}", searchTokens=${JSON.stringify(
      searchTokens,
    )}`,
  );

  // --- 4) Collect candidates from both name and similarity_name ------

  const candidateMap = new Map<string, Ingredient>();

  for (const token of searchTokens) {
    const q = `%${token}%`;
    const partials = await this.ingredientRepo
      .createQueryBuilder('ingredient')
      .where(
        '(LOWER(ingredient.name) LIKE :q OR LOWER(ingredient.similarity_name) LIKE :q)',
        { q },
      )
      .limit(30)
      .getMany();

    for (const cand of partials) {
      if (!candidateMap.has(cand.id)) {
        candidateMap.set(cand.id, cand);
      }
    }
  }

  const candidates = Array.from(candidateMap.values());

  // --- 5) Pick best similarity ---------------------------------------

  let best: Ingredient | null = null;
  let bestScore = 0;

  for (const cand of candidates) {
    const score = ComputeNameSimilarity(
      trimmed,
      cand.name,
      cand.similarity_name,
    );
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  const THRESHOLD = 0.52; // can be tuned

  if (best && bestScore >= THRESHOLD) {
    this.logger.log(
      `Matched LLM ingredient "${trimmed}" -> "${best.name}" (score=${bestScore.toFixed(
        2,
      )})`,
    );
    return best;
  }

  // --- 6) No good match found → call LLM ingredient estimator --------

  this.logger.log(
    `No good fuzzy match for ingredient "${trimmed}" (bestScore=${bestScore.toFixed(
      2,
    )}). Calling LLM ingredient estimator...`,
  );

  let llmEstimate:
    | {
        name: string;
        category?: string;
        kcal_per_100g: number;
        protein_per_100g: number;
        carbs_per_100g: number;
        fat_per_100g: number;
        estimated_price_per_100g_gbp?: number;
        allergen_keys?: string[];
      }
    | null = null;

  try {
    llmEstimate = await this.agentsService.generateIngredientEstimate({
      name: trimmed,
      locale: 'uk',
    });
  } catch (err) {
    this.logger.error(
      `LLM ingredient estimate failed for "${trimmed}": ${(err as Error).message}`,
    );
  }

  if (llmEstimate) {
    const draft: Partial<Ingredient> = {
      name: trimmed,
      similarity_name: normalized,
      category: llmEstimate.category,
      unit_type: 'per_100g',
      kcal_per_unit: llmEstimate.kcal_per_100g,
      protein_per_unit: llmEstimate.protein_per_100g,
      carbs_per_unit: llmEstimate.carbs_per_100g,
      fat_per_unit: llmEstimate.fat_per_100g,
      estimated_price_per_unit_gbp:
        llmEstimate.estimated_price_per_100g_gbp ?? undefined,
      allergen_keys: llmEstimate.allergen_keys || [],
    };

    ingredient = this.ingredientRepo.create(draft);
    await this.ingredientRepo.save(ingredient);

    this.logger.log(
      `Created new ingredient via LLM: "${trimmed}" ` +
        `(kcal=${draft.kcal_per_unit}, protein=${draft.protein_per_unit}, ` +
        `carbs=${draft.carbs_per_unit}, fat=${draft.fat_per_unit}, ` +
        `price=${draft.estimated_price_per_unit_gbp})`,
    );

    return ingredient;
  }

  // --- 7) LLM also failed → safe generic fallback --------------------

  // Generic “unknown ingredient” profile:
  // - Not crazy high or low, avoids 0 values.
  // - Think of it as a mid-density carb-ish food.
  const fallbackDraft: Partial<Ingredient> = {
    name: trimmed,
    similarity_name: normalized,
    category: undefined,
    unit_type: 'per_100g',
    kcal_per_unit: 150, // mid-range kcal
    protein_per_unit: 5, // small protein
    carbs_per_unit: 25, // moderate carbs
    fat_per_unit: 3, // small fat
    estimated_price_per_unit_gbp: 0.75, // mid-range price per 100g
    allergen_keys: [],
  };

  ingredient = this.ingredientRepo.create(fallbackDraft);
  await this.ingredientRepo.save(ingredient);

  this.logger.warn(
    `LLM ingredient estimate unavailable for "${trimmed}". Created generic fallback ingredient with mid-range macros and price.`,
  );

  return ingredient;
}

/**
 * Helper to get or create a 0-macro ingredient for water / seasonings.
 */
private async getOrCreateZeroMacroIngredient(
  name: string,
): Promise<Ingredient> {
  let ing = await this.ingredientRepo.findOne({ where: { name } });
  if (ing) return ing;

  const normalized = NormalizeForMatch(name);

  const draft: Partial<Ingredient> = {
    name,
    similarity_name: normalized,
    unit_type: 'per_100g',
    kcal_per_unit: 0,
    protein_per_unit: 0,
    carbs_per_unit: 0,
    fat_per_unit: 0,
    estimated_price_per_unit_gbp: 0,
    allergen_keys: [],
  };

  ing = this.ingredientRepo.create(draft);
  return this.ingredientRepo.save(ing);
}


  async searchFuzzy(query: string, limit = 5) {
    if (!query.trim()) return [];
    // Check if pg_trgm is available
    const trgmCheck = await this.ingredientRepo.query(
      `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS enabled`,
    );
    const hasTrgm = Boolean(trgmCheck?.[0]?.enabled);
    if (!hasTrgm) {
      const fallback = await this.ingredientRepo
        .createQueryBuilder('ingredient')
        .where('ingredient.name ILIKE :like', { like: `%${query}%` })
        .orderBy('ingredient.name', 'ASC')
        .limit(limit)
        .getMany();
      return fallback.map((ent) => ({ ingredient: ent, score: 0 }));
    }

    const qb = this.ingredientRepo
      .createQueryBuilder('ingredient')
      .addSelect(`similarity(ingredient.name, :q)`, 'sim')
      .where('ingredient.name ILIKE :like', { like: `%${query}%` })
      .orWhere('similarity(ingredient.name, :q) > 0.2')
      .orderBy('sim', 'DESC')
      .addOrderBy('ingredient.name', 'ASC')
      .setParameters({ q: query })
      .limit(limit);
    const rows = await qb.getRawAndEntities();
    return rows.entities.map((ent, idx) => ({
      ingredient: ent,
      score: Number((rows.raw[idx] && rows.raw[idx].sim) || 0),
    }));
  }
}
