import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileCredit1764000000002 implements MigrationInterface {
  name = 'AddProfileCredit1764000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile" ADD COLUMN IF NOT EXISTS "credit" integer NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN IF EXISTS "credit"');
  }
}
