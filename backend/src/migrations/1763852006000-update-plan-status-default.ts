import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePlanStatusDefault1763852006000 implements MigrationInterface {
  name = 'UpdatePlanStatusDefault1763852006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "weekly_plans" ALTER COLUMN "status" SET DEFAULT 'systemdraft'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "weekly_plans" ALTER COLUMN "status" SET DEFAULT 'draft'`);
  }
}
