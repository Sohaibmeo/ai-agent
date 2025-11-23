import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763850500000 implements MigrationInterface {
  name = 'Migration1763850500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_recipe_score" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "score" numeric NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "user_id" uuid,
        "recipe_id" uuid,
        CONSTRAINT "PK_user_recipe_score" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "user_ingredient_score" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "score" numeric NOT NULL DEFAULT '0',
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "user_id" uuid,
        "ingredient_id" uuid,
        CONSTRAINT "PK_user_ingredient_score" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_recipe_score" ADD CONSTRAINT "FK_user_recipe_score_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_recipe_score" ADD CONSTRAINT "FK_user_recipe_score_recipe" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_ingredient_score" ADD CONSTRAINT "FK_user_ing_score_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_ingredient_score" ADD CONSTRAINT "FK_user_ing_score_ing" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_ingredient_score" DROP CONSTRAINT "FK_user_ing_score_ing"`);
    await queryRunner.query(`ALTER TABLE "user_ingredient_score" DROP CONSTRAINT "FK_user_ing_score_user"`);
    await queryRunner.query(`ALTER TABLE "user_recipe_score" DROP CONSTRAINT "FK_user_recipe_score_recipe"`);
    await queryRunner.query(`ALTER TABLE "user_recipe_score" DROP CONSTRAINT "FK_user_recipe_score_user"`);
    await queryRunner.query('DROP TABLE "user_ingredient_score"');
    await queryRunner.query('DROP TABLE "user_recipe_score"');
  }
}
