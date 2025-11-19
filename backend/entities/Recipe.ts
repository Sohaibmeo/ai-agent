import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Recipe {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column("text")
    description!: string;

    @Column("text")
    ingredients!: string;

    @Column("text")
    instructions!: string;

    @Column("float")
    calories!: number;

    @Column("float")
    cost!: number;
}