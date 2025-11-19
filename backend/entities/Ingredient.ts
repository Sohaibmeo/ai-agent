import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Ingredient {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column("text")
    allergens!: string;

    @Column("float")
    costPerUnit!: number;
}