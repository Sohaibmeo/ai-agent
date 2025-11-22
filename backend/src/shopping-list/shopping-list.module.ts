import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListItem } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingListItem])],
  providers: [ShoppingListService],
  controllers: [ShoppingListController],
  exports: [ShoppingListService],
})
export class ShoppingListModule {}
