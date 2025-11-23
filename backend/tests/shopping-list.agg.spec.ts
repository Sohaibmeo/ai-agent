import { ShoppingListService } from '../src/shopping-list/shopping-list.service';
import { Repository } from 'typeorm';
import { ShoppingListItem } from '../src/database/entities';

describe('ShoppingListService aggregation', () => {
  it('throws when no active plan', async () => {
    const repo: any = { find: jest.fn(), delete: jest.fn(), save: jest.fn() };
    const pantryRepo: any = { find: jest.fn() };
    const priceRepo: any = { find: jest.fn() };
    const planRepo: any = { findOne: jest.fn().mockResolvedValue(null) };
    const em: any = { find: jest.fn(), getRepository: jest.fn() };
    const service = new ShoppingListService(
      repo as unknown as Repository<ShoppingListItem>,
      pantryRepo,
      priceRepo,
      planRepo,
      em,
    );
    await expect(service.getActive('u1')).rejects.toThrow('No active plan');
  });
});
