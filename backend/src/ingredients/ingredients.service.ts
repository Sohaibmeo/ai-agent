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

  // 1) Exact match first
  let ingredient = await this.ingredientRepo.findOne({
    where: { name: trimmed },
  });
  if (ingredient) return ingredient;

  // 2) Normalize and pick a "main" food token
  const normalizedInput = NormalizeForMatch(trimmed); // e.g. "mixed berries 100g" -> "mixed berries 100g"
  let tokens = normalizedInput.split(/\s+/).filter(Boolean);

  // Remove obvious measure / unit tokens for main-token selection
  const MEASURE_WORDS = new Set([
    'g', 'gram', 'grams',
    'kg', 'ml', 'l', 'litre', 'litres', 'liter', 'liters',
    'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons',
    'tsp', 'teaspoon', 'teaspoons',
    'slice', 'slices', 'piece', 'pieces',
    'small', 'medium', 'large',
    'oz', 'ounce', 'ounces',
  ]);

  const foodTokens = tokens.filter((t) => {
    if (/^\d+(\.\d+)?$/.test(t)) return false; // pure numbers
    if (MEASURE_WORDS.has(t)) return false;
    return true;
  });

  const rawMainToken = foodTokens[foodTokens.length - 1]
    ?? tokens[tokens.length - 1]
    ?? normalizedInput;

  const mainTokenRoot = Singularize(rawMainToken); // berries -> berry, apples -> apple, wraps -> wrap
  const searchPrimary = mainTokenRoot || rawMainToken || normalizedInput;

  // Helper to run LIKE search
  const runSearch = async (token: string | null | undefined) => {
    if (!token) return [] as Ingredient[];
    const q = `%${token.toLowerCase()}%`;
    return this.ingredientRepo
      .createQueryBuilder('ingredient')
      .where('LOWER(ingredient.name) LIKE :q', { q })
      .limit(50)
      .getMany();
  };

  let candidates: Ingredient[] = [];

  // 3) Try with the root token first (e.g. "berry")
  candidates = await runSearch(searchPrimary);

  // 4) If none, try with raw main token (e.g. "berries")
  if (candidates.length === 0 && rawMainToken !== searchPrimary) {
    candidates = await runSearch(rawMainToken);
  }

  // 5) If still none, try with the whole normalized phrase ("mixed berries")
  if (candidates.length === 0 && normalizedInput !== rawMainToken) {
    candidates = await runSearch(normalizedInput);
  }

  // Filter out junk candidates with empty names
  candidates = candidates.filter((c) => (c.name || '').trim().length > 0);

  // 6) Pick best candidate using similarity on *normalized* strings
  let best: Ingredient | null = null;
  let bestScore = 0;

  for (const cand of candidates) {
    const candNormalized = NormalizeForMatch(cand.name);
    const score = ComputeNameSimilarity(normalizedInput, candNormalized);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  // This threshold is intentionally modest.
  // Examples it should now catch:
  // - "Mixed Berries (100g)"  -> "Strawberries, raw" / "Raspberries, raw"
  // - "Greek yoghurt"         -> "Yogurt, Greek, plain, nonfat"
  // - "whole wheat wrap"      -> "Bread, whole-wheat, commercially prepared" (if no better wrap exists)
  const THRESHOLD = 0.4;

  if (best && bestScore >= THRESHOLD) {
    this.logger.log(
      `Matched LLM ingredient "${trimmed}" -> "${best.name}" (score=${bestScore.toFixed(2)})`,
    );
    return best;
  }

  // 7) Otherwise, create a new ingredient
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
  };

  ingredient = this.ingredientRepo.create(draft);
  await this.ingredientRepo.save(ingredient);
  this.logger.log(
    `Created new ingredient from LLM: "${trimmed}" (no good fuzzy match, bestScore=${bestScore.toFixed(
      2,
    )})`,
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
