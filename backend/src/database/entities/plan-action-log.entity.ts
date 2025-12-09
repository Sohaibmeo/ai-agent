import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WeeklyPlan } from './weekly-plan.entity';

@Entity({ name: 'plan_action_logs' })
export class PlanActionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WeeklyPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weekly_plan_id' })
  weeklyPlan!: WeeklyPlan;

  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  success!: boolean;

  @Column({ type: 'text', nullable: true })
  error_message?: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
