import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1763830119978 implements MigrationInterface {
    name = 'Migration1763830119978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_profile" (
                "user_id" uuid NOT NULL,
                "age" integer,
                "height_cm" integer,
                "weight_kg" integer,
                "activity_level" character varying(50),
                "goal" character varying(50),
                "goal_intensity" character varying(50),
                "diet_type" character varying(50),
                "allergy_keys" text array NOT NULL DEFAULT ARRAY []::text [],
                "breakfast_enabled" boolean NOT NULL DEFAULT true,
                "snack_enabled" boolean NOT NULL DEFAULT true,
                "lunch_enabled" boolean NOT NULL DEFAULT true,
                "dinner_enabled" boolean NOT NULL DEFAULT true,
                "max_difficulty" character varying(50) NOT NULL DEFAULT 'easy',
                "weekly_budget_gbp" numeric,
                CONSTRAINT "PK_eee360f3bff24af1b6890765201" PRIMARY KEY ("user_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "ingredients" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "category" character varying,
                "unit_type" character varying,
                "kcal_per_unit" numeric,
                "protein_per_unit" numeric,
                "carbs_per_unit" numeric,
                "fat_per_unit" numeric,
                "estimated_price_per_unit_gbp" numeric,
                "allergen_keys" text array NOT NULL DEFAULT ARRAY []::text [],
                CONSTRAINT "PK_9240185c8a5507251c9f15e0649" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "recipe_ingredients" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "quantity" numeric NOT NULL,
                "unit" character varying(50) NOT NULL,
                "recipe_id" uuid,
                "ingredient_id" uuid,
                CONSTRAINT "PK_8f15a314e55970414fc92ffb532" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "recipes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "meal_slot" character varying(50) NOT NULL,
                "diet_tags" text array NOT NULL DEFAULT ARRAY []::text [],
                "difficulty" character varying(50) NOT NULL DEFAULT 'easy',
                "base_kcal" numeric,
                "base_protein" numeric,
                "base_carbs" numeric,
                "base_fat" numeric,
                "base_cost_gbp" numeric,
                "is_custom" boolean NOT NULL DEFAULT false,
                "instructions" text,
                "created_by_user_id" uuid,
                CONSTRAINT "PK_8f09680a51bf3669c1598a21682" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "plan_meals" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "meal_slot" character varying(50) NOT NULL,
                "portion_multiplier" numeric NOT NULL DEFAULT '1',
                "meal_kcal" numeric,
                "meal_protein" numeric,
                "meal_carbs" numeric,
                "meal_fat" numeric,
                "meal_cost_gbp" numeric,
                "plan_day_id" uuid,
                "recipe_id" uuid,
                CONSTRAINT "PK_85cd676372cecf9ccb422529b31" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "plan_days" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "day_index" integer NOT NULL,
                "date" date,
                "daily_kcal" numeric,
                "daily_protein" numeric,
                "daily_cost_gbp" numeric,
                "weekly_plan_id" uuid,
                CONSTRAINT "PK_f0213179aed9b137f931c76c912" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "weekly_plans" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "week_start_date" date NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'draft',
                "total_estimated_cost_gbp" numeric,
                "total_kcal" numeric,
                "user_id" uuid,
                CONSTRAINT "PK_6c64b331bf3b98025f865282292" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying,
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "shopping_list_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "total_quantity" numeric NOT NULL,
                "unit" character varying(50) NOT NULL,
                "estimated_cost_gbp" numeric,
                "weekly_plan_id" uuid,
                "ingredient_id" uuid,
                CONSTRAINT "PK_043c112c02fdc1c39fbd619fadb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "pantry_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "has_item" boolean NOT NULL DEFAULT false,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "user_id" uuid,
                "ingredient_id" uuid,
                CONSTRAINT "PK_bb63c18ae1bc99152edd69c4a61" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "user_ingredient_price" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "price_per_unit_gbp" numeric NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "user_id" uuid,
                "ingredient_id" uuid,
                CONSTRAINT "PK_0b597937c140937bb9a5303c592" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profile"
            ADD CONSTRAINT "FK_eee360f3bff24af1b6890765201" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "recipe_ingredients"
            ADD CONSTRAINT "FK_f240137e0e13bed80bdf64fed53" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "recipe_ingredients"
            ADD CONSTRAINT "FK_133545365243061dc2c55dc1373" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "recipes"
            ADD CONSTRAINT "FK_eca8a05e00f1567b91f52ad18a3" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "plan_meals"
            ADD CONSTRAINT "FK_ff892e2012b2fd829e1af47908f" FOREIGN KEY ("plan_day_id") REFERENCES "plan_days"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "plan_meals"
            ADD CONSTRAINT "FK_27a13c1378c72c3819a5a96a971" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "plan_days"
            ADD CONSTRAINT "FK_5d4f50716f13512f2cb2a7b2327" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "weekly_plans"
            ADD CONSTRAINT "FK_f8f5e386965eb0999313598c08b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "shopping_list_items"
            ADD CONSTRAINT "FK_eaf18ca0bffeb1087c0f468a620" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "shopping_list_items"
            ADD CONSTRAINT "FK_730ac7e32ba02bea07da4dba21d" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pantry_items"
            ADD CONSTRAINT "FK_ec53d8efe916b7c27605c885148" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "pantry_items"
            ADD CONSTRAINT "FK_8bd0b9106300bcac6936c1e95e0" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_ingredient_price"
            ADD CONSTRAINT "FK_848fbf44a87c3cd3b76977dadc7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_ingredient_price"
            ADD CONSTRAINT "FK_37c279c6d1b184dfb6484a798c3" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_ingredient_price" DROP CONSTRAINT "FK_37c279c6d1b184dfb6484a798c3"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_ingredient_price" DROP CONSTRAINT "FK_848fbf44a87c3cd3b76977dadc7"
        `);
        await queryRunner.query(`
            ALTER TABLE "pantry_items" DROP CONSTRAINT "FK_8bd0b9106300bcac6936c1e95e0"
        `);
        await queryRunner.query(`
            ALTER TABLE "pantry_items" DROP CONSTRAINT "FK_ec53d8efe916b7c27605c885148"
        `);
        await queryRunner.query(`
            ALTER TABLE "shopping_list_items" DROP CONSTRAINT "FK_730ac7e32ba02bea07da4dba21d"
        `);
        await queryRunner.query(`
            ALTER TABLE "shopping_list_items" DROP CONSTRAINT "FK_eaf18ca0bffeb1087c0f468a620"
        `);
        await queryRunner.query(`
            ALTER TABLE "weekly_plans" DROP CONSTRAINT "FK_f8f5e386965eb0999313598c08b"
        `);
        await queryRunner.query(`
            ALTER TABLE "plan_days" DROP CONSTRAINT "FK_5d4f50716f13512f2cb2a7b2327"
        `);
        await queryRunner.query(`
            ALTER TABLE "plan_meals" DROP CONSTRAINT "FK_27a13c1378c72c3819a5a96a971"
        `);
        await queryRunner.query(`
            ALTER TABLE "plan_meals" DROP CONSTRAINT "FK_ff892e2012b2fd829e1af47908f"
        `);
        await queryRunner.query(`
            ALTER TABLE "recipes" DROP CONSTRAINT "FK_eca8a05e00f1567b91f52ad18a3"
        `);
        await queryRunner.query(`
            ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "FK_133545365243061dc2c55dc1373"
        `);
        await queryRunner.query(`
            ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "FK_f240137e0e13bed80bdf64fed53"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profile" DROP CONSTRAINT "FK_eee360f3bff24af1b6890765201"
        `);
        await queryRunner.query(`
            DROP TABLE "user_ingredient_price"
        `);
        await queryRunner.query(`
            DROP TABLE "pantry_items"
        `);
        await queryRunner.query(`
            DROP TABLE "shopping_list_items"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP TABLE "weekly_plans"
        `);
        await queryRunner.query(`
            DROP TABLE "plan_days"
        `);
        await queryRunner.query(`
            DROP TABLE "plan_meals"
        `);
        await queryRunner.query(`
            DROP TABLE "recipes"
        `);
        await queryRunner.query(`
            DROP TABLE "recipe_ingredients"
        `);
        await queryRunner.query(`
            DROP TABLE "ingredients"
        `);
        await queryRunner.query(`
            DROP TABLE "user_profile"
        `);
    }

}
