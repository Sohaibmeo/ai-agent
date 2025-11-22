import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListItem, Ingredient, WeeklyPlan } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingListItem, Ingredient, WeeklyPlan])],
  providers: [ShoppingListService],
  controllers: [ShoppingListController],
  exports: [ShoppingListService],
})
export class ShoppingListModule {}
