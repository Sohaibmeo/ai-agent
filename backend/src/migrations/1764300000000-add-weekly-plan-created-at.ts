import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeeklyPlanCreatedAt1764300000000 implements MigrationInterface {
  name = 'AddWeeklyPlanCreatedAt1764300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "weekly_plans"
      ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "weekly_plans"
      DROP COLUMN "created_at"
    `);
  }
}
