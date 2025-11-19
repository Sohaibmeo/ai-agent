import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class WeeklyPlan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    userId!: number;

    @Column("date")
    startDate!: string;

    @Column("date")
    endDate!: string;
}