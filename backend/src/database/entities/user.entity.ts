import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { WeeklyPlan } from './weekly-plan.entity';
import { Recipe } from './recipe.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  email?: string;

  @OneToMany(() => UserProfile, (profile) => profile.user)
  profiles!: UserProfile[];

  @OneToMany(() => WeeklyPlan, (plan) => plan.user)
  weeklyPlans!: WeeklyPlan[];

  @OneToMany(() => Recipe, (recipe) => recipe.createdByUser)
  customRecipes!: Recipe[];
}
