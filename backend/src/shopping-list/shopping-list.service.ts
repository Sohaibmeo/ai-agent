import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ingredient,
  PlanMeal,
  RecipeIngredient,
  ShoppingListItem,
  PantryItem,
  UserIngredientPrice,
  WeeklyPlan,
} from '../database/entities';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    @InjectRepository(ShoppingListItem)
    private readonly shoppingListRepo: Repository<ShoppingListItem>,
    @InjectRepository(PantryItem)
    private readonly pantryRepo: Repository<PantryItem>,
    @InjectRepository(UserIngredientPrice)
    private readonly priceRepo: Repository<UserIngredientPrice>,
    @InjectRepository(WeeklyPlan)
    private readonly weeklyPlanRepo: Repository<WeeklyPlan>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  private factorFromQuantity(quantity: number, unitType?: string | null) {
    const normalized = Number(quantity) || 0;
    const base = (unitType || '').toLowerCase();
    const divisor = base === 'per_ml' ? 100 : base === 'per_100g' ? 100 : 1;
    return divisor ? normalized / divisor : normalized;
  }

  async getForPlan(planId: string, userId?: string) {
    const baseItems = await this.shoppingListRepo.find({
      where: { weeklyPlan: { id: planId } },
      relations: ['ingredient'],
    });
    if (!userId) {
      return {
        weekly_plan_id: planId,
        items: baseItems,
      };
    }

    // Apply pantry flags and user price overrides on the fly for response
    const [overrides, pantry] = await Promise.all([
      this.priceRepo.find({ where: { user: { id: userId } as any }, relations: ['ingredient'] }),
      this.pantryRepo.find({ where: { user: { id: userId } as any }, relations: ['ingredient'] }),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.ingredient.id, Number(o.price_per_unit_gbp)]));
    const pantryMap = new Map(pantry.map((p) => [p.ingredient.id, p.has_item]));

    const items = baseItems.map((item) => {
      const pricePerUnit = overrideMap.get(item.ingredient.id);
      const hasItem = pantryMap.get(item.ingredient.id) ?? false;
      const factor = this.factorFromQuantity(item.total_quantity, item.ingredient.unit_type);
      const estimated = pricePerUnit
        ? pricePerUnit * factor
        : item.estimated_cost_gbp ?? (item.ingredient.estimated_price_per_unit_gbp || 0) * factor;
      return {
        ...item,
        estimated_cost_gbp: estimated,
        has_item: hasItem,
      };
    });

    return {
      weekly_plan_id: planId,
      items,
    };
  }

  private async buildEmailTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      throw new Error('SMTP not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)');
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private formatListEmail(items: any[], planId: string, note?: string) {
    const lines = items
      .map((i) => {
        const cost = i.estimated_cost_gbp ? `£${Number(i.estimated_cost_gbp).toFixed(2)}` : '—';
        return `• ${i.ingredient?.name || '—'} — ${Number(i.total_quantity)} ${i.unit || ''} (${cost})${
          i.has_item ? ' ✓' : ''
        }`;
      })
      .join('\n');
    return [
      `Shopping list for plan ${planId}`,
      note ? `Note: ${note}` : '',
      '',
      lines || 'No items.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private formatListEmailHtml(items: any[], planId: string, note?: string) {
    const rows = (items || [])
      .map((i) => {
        const name = i.ingredient?.name || '—';
        const qty = Number(i.total_quantity || 0);
        const unit = i.unit || '';
        const cost = i.estimated_cost_gbp ? `£${Number(i.estimated_cost_gbp).toFixed(2)}` : '—';
        const hasItem = !!i.has_item;

        return `
          <tr>
            <td style="padding: 12px 12px; border-bottom: 1px solid #233044; font-size: 13px; color: #f8fafc;">
              ${name}
            </td>
            <td style="padding: 12px 12px; border-bottom: 1px solid #233044; font-size: 13px; color: #e2e8f0; white-space: nowrap;">
              ${qty} ${unit}
            </td>
            <td style="padding: 12px 12px; border-bottom: 1px solid #233044; font-size: 13px; color: #e2e8f0; white-space: nowrap;">
              ${cost}
            </td>
            <td style="padding: 12px 12px; border-bottom: 1px solid #233044; font-size: 13px; text-align: center; color: #f8fafc;">
              ${hasItem ? '✅' : ''}
            </td>
          </tr>
        `;
      })
      .join('');

    const noteBlock = note
      ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">
          <strong>Note:</strong> ${note}
        </p>`
      : '';

    const appUrl = process.env.APP_BASE_URL || '#';

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Your grocery list</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a; padding: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #0f172a; padding: 0 16px;">
            <tr>
              <td style="padding-bottom: 16px; text-align: left;">
                <span style="display:inline-flex; align-items:center; gap:8px; font-size: 12px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.08em;">
                  <span style="display:inline-flex; align-items:center; justify-content:center; width: 20px; height: 20px; border-radius:999px; background: radial-gradient(circle at 30% 20%, #22c55e, #16a34a); color:#0f172a; font-weight:700;">C</span>
                  <strong style="color:#e2e8f0;">CookTrack</strong>
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius: 18px; border: 1px solid #233044; background: #0b1220; padding: 20px 20px 16px 20px;">
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <h1 style="margin: 0 0 4px 0; font-size: 18px; color: #f8fafc; font-weight: 700;">
                        Your grocery list is ready 🧺
                      </h1>
                      <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
                        Plan ID: <span style="color:#e2e8f0;">${planId}</span>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0 12px 0;">
                      ${noteBlock}
                      <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
                        Here’s a summary of what you need to buy. Tick things off in the app as you shop.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 8px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border-radius: 12px; overflow: hidden; background-color:#0f172a; border: 1px solid #233044;">
                        <thead>
                          <tr style="background: linear-gradient(to right, rgba(16,185,129,0.18), rgba(52,211,153,0.12));">
                            <th align="left" style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color:#e2f3eb; border-bottom: 1px solid #233044;">
                              Ingredient
                            </th>
                            <th align="left" style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color:#e2f3eb; border-bottom: 1px solid #233044;">
                              Quantity
                            </th>
                            <th align="left" style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color:#e2f3eb; border-bottom: 1px solid #233044;">
                              Est. Cost
                            </th>
                            <th align="center" style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color:#e2f3eb; border-bottom: 1px solid #233044;">
                              Have
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          ${
                            rows ||
                            `<tr>
                              <td colspan="4" style="padding: 12px; font-size: 13px; color:#cbd5e1; text-align:center;">
                                No items in this list.
                              </td>
                            </tr>`
                          }
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 16px; text-align:center;">
                      <a href="${appUrl}" target="_blank" style="display:inline-block; padding: 10px 18px; border-radius: 999px; background: linear-gradient(to right, #22c55e, #4ade80); color:#022c22; font-size: 13px; font-weight:600; text-decoration:none;">
                        Open in CookTrack App
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 12px; text-align:center;">
                <p style="margin: 0; font-size: 11px; color:#6b7280;">
                  You’re receiving this email because you generated a grocery list in CookTrack.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;
  }

  async emailList(planId: string) {
    const plan = await this.weeklyPlanRepo.findOne({
      where: { id: planId },
      relations: ['user'],
    });
    if (!plan?.user?.id) {
      throw new Error('Plan or plan user not found');
    }
    const userId = plan.user.id;
    const toEmail = (plan.user as any).email;
    if (!toEmail) {
      throw new Error('No recipient email found for user');
    }
    const list = await this.getForPlan(planId, userId);
    const transport = await this.buildEmailTransport();
    const from = process.env.SMTP_FROM || 'CookTrack <no-reply@cooktrack.local>';
    const subject = 'Your grocery list';
    const items = list.items || [];
    const text = this.formatListEmail(items, planId, undefined);
    const html = this.formatListEmailHtml(items, planId, undefined);
    await transport.sendMail({ from, to: toEmail, subject, text, html });
    this.logger.log(`Sent grocery list email to ${toEmail} for plan=${planId}`);
    return { ok: true };
  }

  async rebuildForPlan(planId: string) {
    const plan = await this.weeklyPlanRepo.findOne({ where: { id: planId }, relations: ['user'] });
    if (!plan) throw new Error('Plan not found');
    const userId = plan.user?.id;
    if (!userId) throw new Error('Plan user missing');
    this.logger.log(`rebuild shopping list plan=${planId} user=${userId}`);

    // Clear existing
    await this.shoppingListRepo.delete({ weeklyPlan: { id: planId } as any });

    // Aggregate ingredients across plan meals
    const meals = await this.entityManager.find(PlanMeal, {
      where: { planDay: { weeklyPlan: { id: planId } } as any },
      relations: ['recipe'],
    });
    if (!meals.length) return [];

    // Load recipe ingredients for all recipes in plan
    const recipeIds = meals.map((m) => m.recipe?.id).filter(Boolean);
    const recipeIngredients = await this.entityManager
      .getRepository(RecipeIngredient)
      .createQueryBuilder('ri')
      .innerJoinAndSelect('ri.ingredient', 'ingredient')
      .innerJoinAndSelect('ri.recipe', 'recipe')
      .where('ri.recipe_id IN (:...recipeIds)', { recipeIds })
      .getMany();

    const totals = new Map<
      string,
      { ingredient: Ingredient; quantity: number; unit: string; costPerUnit?: number }
    >();

    for (const meal of meals) {
      if (!meal.recipe?.id) continue;
      const portion = Number(meal.portion_multiplier || 1);
      const ris = recipeIngredients.filter((ri) => ri.recipe.id === meal.recipe.id);
      for (const ri of ris) {
        const key = ri.ingredient.id;
        const current = totals.get(key);
        const quantity = Number(ri.quantity) * portion;
        if (current) {
          current.quantity += quantity;
        } else {
          totals.set(key, {
            ingredient: ri.ingredient,
            quantity,
            unit: ri.unit,
            costPerUnit: ri.ingredient.estimated_price_per_unit_gbp
              ? Number(ri.ingredient.estimated_price_per_unit_gbp)
              : undefined,
          });
        }
      }
    }

    // Apply user price overrides and pantry flags
    const overrides = await this.priceRepo.find({ where: { user: { id: userId } as any } });
    const overrideMap = new Map(overrides.map((o) => [o.ingredient.id, Number(o.price_per_unit_gbp)]));
    const pantry = await this.pantryRepo.find({ where: { user: { id: userId } as any } });
    const pantryMap = new Map(pantry.map((p) => [p.ingredient.id, p.has_item]));

    const toSave: Partial<ShoppingListItem>[] = [];
    for (const [, val] of totals) {
      const pricePerUnit = overrideMap.get(val.ingredient.id) ?? val.costPerUnit;
      const factor = this.factorFromQuantity(val.quantity, val.ingredient.unit_type);
      const estimatedCost = pricePerUnit ? pricePerUnit * factor : undefined;
      const hasInPantry = pantryMap.get(val.ingredient.id) ?? false;
      toSave.push({
        weeklyPlan: { id: planId } as any,
        ingredient: val.ingredient,
        total_quantity: val.quantity,
        unit: val.unit,
        estimated_cost_gbp: estimatedCost,
        // @ts-expect-error extra runtime flag not in entity
        hasInPantry,
      });
    }

    await this.shoppingListRepo.save(toSave);
    this.logger.log(`shopping list rebuilt plan=${planId} items=${toSave.length}`);
    return this.getForPlan(planId, userId);
  }

  async getActive(userId: string, planId?: string) {
    let targetPlanId = planId;
    if (!targetPlanId) {
      const plan = await this.weeklyPlanRepo.findOne({
        where: { user: { id: userId } as any, status: 'active' },
      });
      targetPlanId = plan?.id;
    }
    if (!targetPlanId) {
      throw new Error('No active plan for this user');
    }
    this.logger.log(`get active shopping list plan=${targetPlanId} user=${userId}`);
    return this.getForPlan(targetPlanId, userId);
  }

  async updatePantry(userId: string, ingredientId: string, hasItem: boolean, planId?: string) {
    const existing = await this.pantryRepo.findOne({
      where: { user: { id: userId } as any, ingredient: { id: ingredientId } as any },
    });
    if (existing) {
      existing.has_item = hasItem;
      await this.pantryRepo.save(existing);
    } else {
      await this.pantryRepo.save({
        user: { id: userId } as any,
        ingredient: { id: ingredientId } as any,
        has_item: hasItem,
      });
    }
    const targetPlanId = planId || (await this.weeklyPlanRepo.findOne({ where: { user: { id: userId } as any, status: 'active' } }))?.id;
    if (targetPlanId) {
      return this.getForPlan(targetPlanId, userId);
    }
    return this.getActive(userId);
  }

  async updatePrice(
    userId: string,
    ingredientId: string,
    pricePaid: number,
    quantity: number,
    unit: string,
    planId?: string,
  ) {
    const normalizedQuantity =
      unit === 'kg' ? quantity * 1000 : unit === 'g' ? quantity : unit === 'l' ? quantity * 1000 : unit === 'ml' ? quantity : quantity;
    const ingredient = await this.priceRepo.manager.findOne(Ingredient, { where: { id: ingredientId } });
    const unitType = ingredient?.unit_type || 'per_100g';
    const divisor = unitType === 'per_ml' ? 100 : unitType === 'per_100g' ? 100 : 1;
    const baseUnits = normalizedQuantity / divisor;
    const perUnit = baseUnits > 0 ? pricePaid / baseUnits : null;
    if (!perUnit) {
      throw new Error('quantity must be greater than zero');
    }
    const existing = await this.priceRepo.findOne({
      where: { user: { id: userId } as any, ingredient: { id: ingredientId } as any },
    });
    if (existing) {
      existing.price_per_unit_gbp = perUnit;
      await this.priceRepo.save(existing);
    } else {
      await this.priceRepo.save({
        user: { id: userId } as any,
        ingredient: { id: ingredientId } as any,
        price_per_unit_gbp: perUnit,
      });
    }
    let targetPlanId = planId;
    if (!targetPlanId) {
      const plan = await this.weeklyPlanRepo.findOne({ where: { user: { id: userId } as any, status: 'active' } });
      targetPlanId = plan?.id;
    }
    if (targetPlanId) {
      await this.rebuildForPlan(targetPlanId);
      return this.getForPlan(targetPlanId, userId);
    }
    return this.getActive(userId);
  }
}
