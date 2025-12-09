import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WeeklyPlan } from './weekly-plan.entity';
import { PlanMeal } from './plan-meal.entity';

@Entity({ name: 'plan_days' })
export class PlanDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WeeklyPlan, (plan) => plan.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weekly_plan_id' })
  weeklyPlan!: WeeklyPlan;

  @Column({ type: 'int' })
  day_index!: number;

  @Column({ type: 'date', nullable: true })
  date?: string;

  @Column({ type: 'numeric', nullable: true })
  daily_kcal?: number;

  @Column({ type: 'numeric', nullable: true })
  daily_protein?: number;

  @Column({ type: 'numeric', nullable: true })
  daily_carbs?: number;

  @Column({ type: 'numeric', nullable: true })
  daily_fat?: number;

  @Column({ type: 'numeric', nullable: true })
  daily_cost_gbp?: number;

  @OneToMany(() => PlanMeal, (meal) => meal.planDay)
  meals!: PlanMeal[];
}
