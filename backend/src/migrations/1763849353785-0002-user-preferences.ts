import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1763849353785 implements MigrationInterface {
    name = 'Migration1763849353785'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "liked_ingredients" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "disliked_ingredients" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "preferred_cuisines" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "notes" jsonb,
                "user_id" uuid,
                CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profile"
            ALTER COLUMN "allergy_keys"
            SET DEFAULT ARRAY []::text []
        `);
        await queryRunner.query(`
            ALTER TABLE "ingredients"
            ALTER COLUMN "allergen_keys"
            SET DEFAULT ARRAY []::text []
        `);
        await queryRunner.query(`
            ALTER TABLE "recipes"
            ALTER COLUMN "diet_tags"
            SET DEFAULT ARRAY []::text []
        `);
        await queryRunner.query(`
            ALTER TABLE "user_preferences"
            ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"
        `);
        await queryRunner.query(`
            ALTER TABLE "recipes"
            ALTER COLUMN "diet_tags"
            SET DEFAULT ARRAY []
        `);
        await queryRunner.query(`
            ALTER TABLE "ingredients"
            ALTER COLUMN "allergen_keys"
            SET DEFAULT ARRAY []
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profile"
            ALTER COLUMN "allergy_keys"
            SET DEFAULT ARRAY []
        `);
        await queryRunner.query(`
            DROP TABLE "user_preferences"
        `);
    }

}
