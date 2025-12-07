import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIngredientDateCreated1763852012000 implements MigrationInterface {
  name = 'AddIngredientDateCreated1763852012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ingredients" ADD COLUMN "date_created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ingredients" DROP COLUMN "date_created"`);
  }
}
