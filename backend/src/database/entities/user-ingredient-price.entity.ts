import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Ingredient } from './ingredient.entity';

@Entity({ name: 'user_ingredient_price' })
export class UserIngredientPrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Ingredient, { eager: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: Ingredient;

  @Column({ type: 'numeric' })
  price_per_unit_gbp!: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
