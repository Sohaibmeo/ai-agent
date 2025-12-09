import { MigrationInterface, QueryRunner } from 'typeorm';

// Safety migration to ensure plan macro summary columns exist on weekly_plans and plan_days.
export class AddPlanMacrosRepair1763852009000 implements MigrationInterface {
  name = 'AddPlanMacrosRepair1763852009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE weekly_plans
        ADD COLUMN IF NOT EXISTS total_estimated_cost_gbp numeric,
        ADD COLUMN IF NOT EXISTS total_kcal numeric,
        ADD COLUMN IF NOT EXISTS total_protein numeric,
        ADD COLUMN IF NOT EXISTS total_carbs numeric,
        ADD COLUMN IF NOT EXISTS total_fat numeric
    `);

    await queryRunner.query(`
      ALTER TABLE plan_days
        ADD COLUMN IF NOT EXISTS daily_carbs numeric,
        ADD COLUMN IF NOT EXISTS daily_fat numeric
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE plan_days
        DROP COLUMN IF EXISTS daily_carbs,
        DROP COLUMN IF EXISTS daily_fat
    `);

    await queryRunner.query(`
      ALTER TABLE weekly_plans
        DROP COLUMN IF EXISTS total_estimated_cost_gbp,
        DROP COLUMN IF EXISTS total_kcal,
        DROP COLUMN IF EXISTS total_protein,
        DROP COLUMN IF EXISTS total_carbs,
        DROP COLUMN IF EXISTS total_fat
    `);
  }
}
