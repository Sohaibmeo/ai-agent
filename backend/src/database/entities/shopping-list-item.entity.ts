import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WeeklyPlan } from './weekly-plan.entity';
import { Ingredient } from './ingredient.entity';

@Entity({ name: 'shopping_list_items' })
export class ShoppingListItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WeeklyPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weekly_plan_id' })
  weeklyPlan!: WeeklyPlan;

  @ManyToOne(() => Ingredient, { eager: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: Ingredient;

  @Column({ type: 'numeric' })
  total_quantity!: number;

  @Column({ type: 'varchar', length: 50 })
  unit!: string;

  @Column({ type: 'numeric', nullable: true })
  estimated_cost_gbp?: number;
}
