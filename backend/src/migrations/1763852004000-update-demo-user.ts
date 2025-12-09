import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763852004000 implements MigrationInterface {
  name = 'Migration1763852004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const oldId = '11111111-1111-1111-1111-111111111111';
    const newId = '674fac73-a45a-4bec-8ee3-278d395e6faa';
    await queryRunner.query(`INSERT INTO users (id, email) SELECT $2, email FROM users WHERE id = $1 ON CONFLICT DO NOTHING`, [
      oldId,
      newId,
    ]);
    await queryRunner.query(`UPDATE user_profile SET user_id = $2 WHERE user_id = $1`, [oldId, newId]);
    await queryRunner.query(`DELETE FROM users WHERE id = $1`, [oldId]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const oldId = '11111111-1111-1111-1111-111111111111';
    const newId = '674fac73-a45a-4bec-8ee3-278d395e6faa';
    await queryRunner.query(`INSERT INTO users (id, email) SELECT $1, email FROM users WHERE id = $2 ON CONFLICT DO NOTHING`, [
      oldId,
      newId,
    ]);
    await queryRunner.query(`UPDATE user_profile SET user_id = $1 WHERE user_id = $2`, [oldId, newId]);
    await queryRunner.query(`DELETE FROM users WHERE id = $1`, [newId]);
  }
}
