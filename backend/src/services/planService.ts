import axios from "axios";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { deriveMacroTargets } from "./nutrition.js";
import { AgentPlanResponse } from "../types/plan.js";

export async function generatePlanForUser(userId: string) {
  const user = await prisma.userProfile.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("User not found");
  }

  const macros = deriveMacroTargets({
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    age: user.age,
    activityLevel: user.activityLevel,
    goal: user.fitnessGoal,
  });

  const recipes = await prisma.recipe.findMany({ take: 25 });

  const payload = {
    user,
    macros,
    recipes,
  };

  const { data } = await axios.post<AgentPlanResponse>(
    `${env.AGENT_SERVICE_URL}/plan/generate`,
    payload,
  );

  const planRecord = await prisma.mealPlan.create({
    data: {
      userId: user.id,
      summary: data.summary,
      totalCalories: data.totals.calories,
      totalProtein: data.totals.protein,
      totalCostCents: data.totals.costCents,
      planJson: data.days,
      agentVersion: data.agentVersion,
    },
  });

  return {
    plan: planRecord,
    macros,
    agentResponse: data,
  };
}

export function listPlansForUser(userId: string) {
  return prisma.mealPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
