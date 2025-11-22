import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListItem, PantryItem, UserIngredientPrice, Ingredient } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingListItem, PantryItem, UserIngredientPrice, Ingredient])],
  providers: [ShoppingListService],
  controllers: [ShoppingListController],
  exports: [ShoppingListService],
})
export class ShoppingListModule {}
