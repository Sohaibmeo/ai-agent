import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PlanDay } from './plan-day.entity';
import { Recipe } from './recipe.entity';

@Entity({ name: 'plan_meals' })
export class PlanMeal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PlanDay, (day) => day.meals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_day_id' })
  planDay!: PlanDay;

  @ManyToOne(() => Recipe, { eager: true })
  @JoinColumn({ name: 'recipe_id' })
  recipe!: Recipe;

  @Column({ type: 'varchar', length: 50 })
  meal_slot!: string;

  @Column({ type: 'numeric', default: 1 })
  portion_multiplier!: number;

  @Column({ type: 'numeric', nullable: true })
  meal_kcal?: number;

  @Column({ type: 'numeric', nullable: true })
  meal_protein?: number;

  @Column({ type: 'numeric', nullable: true })
  meal_carbs?: number;

  @Column({ type: 'numeric', nullable: true })
  meal_fat?: number;

  @Column({ type: 'numeric', nullable: true })
  meal_cost_gbp?: number;
}
