import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShoppingListItem } from '../database/entities';

@Injectable()
export class ShoppingListService {
  constructor(
    @InjectRepository(ShoppingListItem)
    private readonly shoppingListRepo: Repository<ShoppingListItem>,
  ) {}

  getForPlan(planId: string) {
    return this.shoppingListRepo.find({
      where: { weeklyPlan: { id: planId } },
    });
  }
}
