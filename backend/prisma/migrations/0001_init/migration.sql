-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('LOSE_FAT', 'MAINTAIN', 'GAIN_MUSCLE');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "weeklyBudgetCents" INTEGER NOT NULL,
    "dietaryPreferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fitnessGoal" "FitnessGoal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinGrams" INTEGER NOT NULL,
    "carbsGrams" INTEGER NOT NULL,
    "fatGrams" INTEGER NOT NULL,
    "costCents" INTEGER NOT NULL,
    "dietTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ingredients" TEXT[],
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "totalCalories" INTEGER NOT NULL,
    "totalProtein" INTEGER NOT NULL,
    "totalCostCents" INTEGER NOT NULL,
    "planJson" JSONB NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_name_key" ON "Recipe"("name");

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

