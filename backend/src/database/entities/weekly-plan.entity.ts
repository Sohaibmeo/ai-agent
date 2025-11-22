import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { PlanDay } from './plan-day.entity';

@Entity({ name: 'weekly_plans' })
export class WeeklyPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.weeklyPlans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'date' })
  week_start_date!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'numeric', nullable: true })
  total_estimated_cost_gbp?: number;

  @Column({ type: 'numeric', nullable: true })
  total_kcal?: number;

  @OneToMany(() => PlanDay, (day) => day.weeklyPlan)
  days!: PlanDay[];
}
