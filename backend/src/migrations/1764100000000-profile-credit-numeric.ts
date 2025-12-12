import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileCreditNumeric1764100000000 implements MigrationInterface {
  name = 'ProfileCreditNumeric1764100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "credit" TYPE numeric USING credit::numeric',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user_profile" ALTER COLUMN "credit" TYPE integer USING credit::integer',
    );
  }
}
