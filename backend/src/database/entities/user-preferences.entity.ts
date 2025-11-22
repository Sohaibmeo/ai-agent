import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_preferences' })
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  liked_ingredients!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  disliked_ingredients!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  liked_meals!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  disliked_meals!: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  preferred_cuisines!: Record<string, number>;

  @Column({ type: 'jsonb', nullable: true })
  notes?: Record<string, unknown>;
}
