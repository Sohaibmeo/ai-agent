import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileHeightWeightNumeric1764000000001 implements MigrationInterface {
  name = 'ProfileHeightWeightNumeric1764000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "height_cm" TYPE numeric USING height_cm::numeric',
    );
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "weight_kg" TYPE numeric USING weight_kg::numeric',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "weight_kg" TYPE integer USING weight_kg::integer',
    );
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "height_cm" TYPE integer USING height_cm::integer',
    );
  }
}
