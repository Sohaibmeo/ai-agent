import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763852003000 implements MigrationInterface {
  name = 'Migration1763852003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_trgm"`);
  }
}
