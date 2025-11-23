import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763851200000 implements MigrationInterface {
  name = 'Migration1763851200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_recipe_score_unique" ON "user_recipe_score" ("user_id", "recipe_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_ingredient_score_unique" ON "user_ingredient_score" ("user_id", "ingredient_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_ingredient_score_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_recipe_score_unique"`);
  }
}
