import { Injectable } from '@nestjs/common';

@Injectable()
export class ShoppingListService {
  getForPlan(planId: string) {
    return { planId, items: [] };
  }
}
