import { MigrationInterface, QueryRunner } from 'typeorm';

// Consolidated repair migration to ensure critical columns exist across core tables.
export class BaselineRepair1763852011000 implements MigrationInterface {
  name = 'BaselineRepair1763852011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Weekly plan aggregates
    await queryRunner.query(`
      ALTER TABLE weekly_plans
        ADD COLUMN IF NOT EXISTS total_estimated_cost_gbp numeric,
        ADD COLUMN IF NOT EXISTS total_kcal numeric,
        ADD COLUMN IF NOT EXISTS total_protein numeric,
        ADD COLUMN IF NOT EXISTS total_carbs numeric,
        ADD COLUMN IF NOT EXISTS total_fat numeric
    `);

    // Plan day aggregates
    await queryRunner.query(`
      ALTER TABLE plan_days
        ADD COLUMN IF NOT EXISTS daily_carbs numeric,
        ADD COLUMN IF NOT EXISTS daily_fat numeric
    `);

    // Recipe metadata
    await queryRunner.query(`
      ALTER TABLE recipes
        ADD COLUMN IF NOT EXISTS meal_type varchar(20) DEFAULT 'solid',
        ADD COLUMN IF NOT EXISTS source varchar(20) DEFAULT 'catalog',
        ADD COLUMN IF NOT EXISTS is_searchable boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS price_estimated boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS created_by_user_id uuid
    `);

    // Ingredient matching / pricing fields
    await queryRunner.query(`
      ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS similarity_name varchar,
        ADD COLUMN IF NOT EXISTS unit_type varchar(20),
        ADD COLUMN IF NOT EXISTS estimated_price_per_unit_gbp numeric,
        ADD COLUMN IF NOT EXISTS allergen_keys text[] DEFAULT ARRAY[]::text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ingredients
        DROP COLUMN IF EXISTS allergen_keys,
        DROP COLUMN IF EXISTS estimated_price_per_unit_gbp,
        DROP COLUMN IF EXISTS unit_type,
        DROP COLUMN IF EXISTS similarity_name
    `);

    await queryRunner.query(`
      ALTER TABLE recipes
        DROP COLUMN IF EXISTS created_by_user_id,
        DROP COLUMN IF EXISTS price_estimated,
        DROP COLUMN IF EXISTS is_searchable,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS meal_type
    `);

    await queryRunner.query(`
      ALTER TABLE plan_days
        DROP COLUMN IF EXISTS daily_fat,
        DROP COLUMN IF EXISTS daily_carbs
    `);

    await queryRunner.query(`
      ALTER TABLE weekly_plans
        DROP COLUMN IF EXISTS total_fat,
        DROP COLUMN IF EXISTS total_carbs,
        DROP COLUMN IF EXISTS total_protein,
        DROP COLUMN IF EXISTS total_kcal,
        DROP COLUMN IF EXISTS total_estimated_cost_gbp
    `);
  }
}
