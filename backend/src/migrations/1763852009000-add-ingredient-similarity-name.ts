import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIngredientSimilarityName1763852009000 implements MigrationInterface {
  name = 'AddIngredientSimilarityName1763852009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ingredients" ADD COLUMN "similarity_name" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ingredients" DROP COLUMN "similarity_name"`);
  }
}
