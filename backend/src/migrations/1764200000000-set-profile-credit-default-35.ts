import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetProfileCreditDefault351764200000000 implements MigrationInterface {
  name = 'SetProfileCreditDefault351764200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "credit" SET DEFAULT 37',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "credit" SET DEFAULT 0',
    );
  }
}
