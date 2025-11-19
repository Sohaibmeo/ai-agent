import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class PlanMeal {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    weeklyPlanId!: number;

    @Column()
    recipeId!: number;

    @Column()
    day!: string;

    @Column()
    mealType!: string; // e.g., breakfast, lunch, dinner
}