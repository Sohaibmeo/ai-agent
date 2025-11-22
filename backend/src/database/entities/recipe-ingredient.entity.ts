import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Recipe } from './recipe.entity';
import { Ingredient } from './ingredient.entity';

@Entity({ name: 'recipe_ingredients' })
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe!: Recipe;

  @ManyToOne(() => Ingredient, { eager: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: Ingredient;

  @Column({ type: 'numeric' })
  quantity!: number;

  @Column({ type: 'varchar', length: 50 })
  unit!: string;
}
