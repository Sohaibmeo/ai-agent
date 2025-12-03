import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecipeFlags1763852008000 implements MigrationInterface {
  name = 'AddRecipeFlags1763852008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recipes" ADD COLUMN "source" varchar(20) NOT NULL DEFAULT 'catalog'`);
    await queryRunner.query(`ALTER TABLE "recipes" ADD COLUMN "is_searchable" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "recipes" ADD COLUMN "price_estimated" boolean NOT NULL DEFAULT false`);
    // Make existing recipes searchable and mark as catalog
    await queryRunner.query(`UPDATE "recipes" SET "is_searchable" = true, "source" = 'catalog' WHERE "is_searchable" = false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recipes" DROP COLUMN "price_estimated"`);
    await queryRunner.query(`ALTER TABLE "recipes" DROP COLUMN "is_searchable"`);
    await queryRunner.query(`ALTER TABLE "recipes" DROP COLUMN "source"`);
  }
}
