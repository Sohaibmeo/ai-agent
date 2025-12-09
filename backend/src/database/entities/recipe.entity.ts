import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';

@Entity({ name: 'recipes' })
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  meal_slot!: string;

  @Column({ type: 'varchar', length: 20, default: 'solid' })
  meal_type!: 'solid' | 'drinkable';

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  diet_tags!: string[];

  @Column({ type: 'varchar', length: 50, default: 'easy' })
  difficulty!: string;

  @Column({ type: 'numeric', nullable: true })
  base_kcal?: number;

  @Column({ type: 'numeric', nullable: true })
  base_protein?: number;

  @Column({ type: 'numeric', nullable: true })
  base_carbs?: number;

  @Column({ type: 'numeric', nullable: true })
  base_fat?: number;

  @Column({ type: 'numeric', nullable: true })
  base_cost_gbp?: number;

  @Column({ default: false })
  is_custom!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'catalog' })
  source!: 'catalog' | 'user' | 'llm';

  @Column({ default: false })
  is_searchable!: boolean;

  @Column({ default: false })
  price_estimated!: boolean;

  @ManyToOne(() => User, (user) => user.customRecipes, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User;

  @Column({ type: 'text', nullable: true })
  instructions?: string;

  @OneToMany(() => RecipeIngredient, (ri) => ri.recipe)
  ingredients!: RecipeIngredient[];
}
