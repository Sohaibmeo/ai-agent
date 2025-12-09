import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Recipe } from './recipe.entity';

@Entity({ name: 'user_recipe_score' })
export class UserRecipeScore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Recipe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe!: Recipe;

  @Column({ type: 'numeric', default: 0 })
  score!: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
