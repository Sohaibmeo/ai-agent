import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763849980000 implements MigrationInterface {
  name = 'Migration1763849980000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN "liked_meals" jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN "disliked_meals" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN "liked_meals",
      DROP COLUMN "disliked_meals"
    `);
  }
}
