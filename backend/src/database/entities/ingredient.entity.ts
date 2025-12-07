import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ingredients' })
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  unit_type?: string;

  @Column({ nullable: true })
  similarity_name?: string;

  @Column({ type: 'numeric', nullable: true })
  kcal_per_unit?: number;

  @Column({ type: 'numeric', nullable: true })
  protein_per_unit?: number;

  @Column({ type: 'numeric', nullable: true })
  carbs_per_unit?: number;

  @Column({ type: 'numeric', nullable: true })
  fat_per_unit?: number;

  @Column({ type: 'numeric', nullable: true })
  estimated_price_per_unit_gbp?: number;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  allergen_keys!: string[];

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  date_created!: Date;
}
