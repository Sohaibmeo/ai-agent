import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlanActionLog1763852007000 implements MigrationInterface {
  name = 'CreatePlanActionLog1763852007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plan_action_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "weekly_plan_id" uuid NOT NULL,
        "user_id" uuid,
        "action" character varying(100) NOT NULL,
        "metadata" jsonb,
        "success" boolean NOT NULL DEFAULT true,
        "error_message" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plan_action_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plan_action_plan" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plan_action_logs"`);
  }
}
