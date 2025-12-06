import { MigrationInterface, QueryRunner } from 'typeorm';

// Repair migration to ensure missing ingredient metadata columns exist.
export class AddMissingIngredientColumns1763852010000 implements MigrationInterface {
  name = 'AddMissingIngredientColumns1763852010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS similarity_name varchar,
        ADD COLUMN IF NOT EXISTS unit_type varchar(20),
        ADD COLUMN IF NOT EXISTS estimated_price_per_unit_gbp numeric
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ingredients
        DROP COLUMN IF EXISTS similarity_name,
        DROP COLUMN IF EXISTS unit_type,
        DROP COLUMN IF EXISTS estimated_price_per_unit_gbp
    `);
  }
}
