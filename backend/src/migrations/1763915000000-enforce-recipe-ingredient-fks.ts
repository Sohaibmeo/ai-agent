import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures recipe_ingredients has non-null FKs to recipes and ingredients.
 * Cleans up any null rows and enforces NOT NULL + FK constraints.
 */
export class EnforceRecipeIngredientFks1763915000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove any orphaned rows before enforcing constraints
    await queryRunner.query(`DELETE FROM recipe_ingredients WHERE recipe_id IS NULL OR ingredient_id IS NULL`);

    await queryRunner.query(`ALTER TABLE recipe_ingredients ALTER COLUMN recipe_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE recipe_ingredients ALTER COLUMN ingredient_id SET NOT NULL`);

    // Add FKs if missing
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_recipe_ingredients_recipe'
            AND table_name = 'recipe_ingredients'
        ) THEN
          ALTER TABLE recipe_ingredients
          ADD CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id)
          REFERENCES recipes(id) ON DELETE CASCADE;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_recipe_ingredients_ingredient'
            AND table_name = 'recipe_ingredients'
        ) THEN
          ALTER TABLE recipe_ingredients
          ADD CONSTRAINT fk_recipe_ingredients_ingredient FOREIGN KEY (ingredient_id)
          REFERENCES ingredients(id);
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_recipe_ingredients_recipe'
            AND table_name = 'recipe_ingredients'
        ) THEN
          ALTER TABLE recipe_ingredients DROP CONSTRAINT fk_recipe_ingredients_recipe;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_recipe_ingredients_ingredient'
            AND table_name = 'recipe_ingredients'
        ) THEN
          ALTER TABLE recipe_ingredients DROP CONSTRAINT fk_recipe_ingredients_ingredient;
        END IF;
      END$$;
    `);

    await queryRunner.query(`ALTER TABLE recipe_ingredients ALTER COLUMN recipe_id DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE recipe_ingredients ALTER COLUMN ingredient_id DROP NOT NULL`);
  }
}
