import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Ingredient } from './ingredient.entity';

@Entity({ name: 'pantry_items' })
export class PantryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Ingredient, { eager: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: Ingredient;

  @Column({ default: false })
  has_item!: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
