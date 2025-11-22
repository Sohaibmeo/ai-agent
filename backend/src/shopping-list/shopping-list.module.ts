import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingListController } from './shopping-list.controller';
import {
  ShoppingListItem,
  PantryItem,
  UserIngredientPrice,
  Ingredient,
  WeeklyPlan,
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingListItem, PantryItem, UserIngredientPrice, Ingredient, WeeklyPlan]),
  ],
  providers: [ShoppingListService],
  controllers: [ShoppingListController],
  exports: [ShoppingListService],
})
export class ShoppingListModule {}
