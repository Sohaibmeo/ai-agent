import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763852001000 implements MigrationInterface {
  name = 'Migration1763852001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recipes"
      ADD COLUMN "meal_type" VARCHAR(20) NOT NULL DEFAULT 'solid'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "recipes" DROP COLUMN "meal_type"
    `);
  }
}
