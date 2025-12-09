import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Ingredient } from './ingredient.entity';

@Entity({ name: 'user_ingredient_score' })
export class UserIngredientScore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Ingredient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: Ingredient;

  @Column({ type: 'numeric', default: 0 })
  score!: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
