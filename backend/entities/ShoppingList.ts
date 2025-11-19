import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class ShoppingList {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    userId!: number;

    @Column("text")
    items!: string; // JSON string of shopping list items
}