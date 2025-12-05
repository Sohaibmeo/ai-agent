import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ingredient } from '../database/entities';
import { NormalizeForMatch, ComputeNameSimilarity, Singularize } from '../ingredients/helper/normalize';

@Injectable()
export class IngredientsService implements OnModuleInit {
  private readonly logger = new Logger(IngredientsService.name);

  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepo: Repository<Ingredient>,
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

  // 1) Exact match on full name
  let ingredient = await this.ingredientRepo.findOne({
    where: { name: trimmed },
  });

  if (ingredient) {
    return ingredient;
  }

  // 2) Exact match on similarity_name (using our normalized form)
  const normalized = NormalizeForMatch(trimmed); // e.g. "salmon fillet" -> "salmon fillet"
  if (normalized) {
    ingredient = await this.ingredientRepo.findOne({
      where: { similarity_name: normalized },
    });

    if (ingredient) {
      this.logger.log(
        `Matched LLM ingredient "${trimmed}" exactly by similarity_name -> "${ingredient.name}"`,
      );
      return ingredient;
    }
  }

  // 3) Build search tokens (from most specific to more generic)
  const tokens = normalized.split(' ').filter(Boolean); // ["salmon", "fillet"] etc.
  const searchTokens: string[] = [];

  if (tokens.length > 0) {
    // last token, singularized ("berries" -> "berry")
    const last = Singularize(tokens[tokens.length - 1]);
    if (last) searchTokens.push(last);
  }

  if (tokens.length > 1) {
    // first token
    const first = Singularize(tokens[0]);
    if (first && !searchTokens.includes(first)) searchTokens.push(first);
  }

  // also try each individual token (helps with "red kidney beans" etc.)
  for (const t of tokens) {
    const sing = Singularize(t);
    if (sing && !searchTokens.includes(sing)) {
      searchTokens.push(sing);
    }
  }

  // fallback: full normalized string
  if (!searchTokens.includes(normalized) && normalized) {
    searchTokens.push(normalized);
  }

  this.logger.debug(
    `findOrCreateByName("${trimmed}") normalized="${normalized}", searchTokens=${JSON.stringify(
      searchTokens,
    )}`,
  );

  // 4) Collect candidates for ALL search tokens, searching both name & similarity_name
  const candidateMap = new Map<string, Ingredient>();

  for (const token of searchTokens) {
    const q = `%${token}%`;

    const partials = await this.ingredientRepo
      .createQueryBuilder('ingredient')
      .where(
        '(LOWER(ingredient.name) LIKE :q OR LOWER(ingredient.similarity_name) LIKE :q)',
        { q },
      )
      .limit(40)
      .getMany();

    for (const cand of partials) {
      if (!candidateMap.has(cand.id)) {
        candidateMap.set(cand.id, cand);
      }
    }
  }

  const candidates = Array.from(candidateMap.values());

  // 5) If we found candidates, pick best similarity (using name + similarity_name)
  let best: Ingredient | null = null;
  let bestScore = 0;

  for (const cand of candidates) {
    const score = ComputeNameSimilarity(
      trimmed,
      cand.name,
      cand.similarity_name ?? undefined,
    );
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  const THRESHOLD = 0.55; // tune if needed

  if (best && bestScore >= THRESHOLD) {
    this.logger.log(
      `Matched LLM ingredient "${trimmed}" -> "${best.name}" (score=${bestScore.toFixed(
        2,
      )})`,
    );
    return best;
  }

  // 6) No good match found -> create a new ingredient
  const draft: Partial<Ingredient> = {
    name: trimmed,
    category: undefined,
    unit_type: 'per_100g',
    kcal_per_unit: undefined,
    protein_per_unit: undefined,
    carbs_per_unit: undefined,
    fat_per_unit: undefined,
    estimated_price_per_unit_gbp: undefined,
    allergen_keys: [],
    similarity_name: normalized || undefined,
  };

  ingredient = this.ingredientRepo.create(draft);
  await this.ingredientRepo.save(ingredient);

  this.logger.log(
    `Created new ingredient from LLM: "${trimmed}" (no good fuzzy match, bestScore=${bestScore.toFixed(
      2,
    )}, tokens=${JSON.stringify(searchTokens)})`,
  );

  return ingredient;
}


  // Try to resolve by id or name; if not found and a name is provided, create a minimal ingredient entry.
  async resolveOrCreateLoose(identifier?: string) {
    if (!identifier) return null;
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(trimmed);
    if (isUuid) {
      const byId = await this.findById(trimmed);
      if (byId) return byId;
    }
    const byName = await this.findByNameCaseInsensitive(trimmed);
    if (byName) return byName;
    // Create minimal ingredient with safe defaults
    const created = this.ingredientRepo.create({
      name: trimmed,
      category: 'custom',
      unit_type: 'per_piece',
      kcal_per_unit: 0,
      protein_per_unit: 0,
      carbs_per_unit: 0,
      fat_per_unit: 0,
      estimated_price_per_unit_gbp: 0,
    });
    return this.ingredientRepo.save(created);
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
