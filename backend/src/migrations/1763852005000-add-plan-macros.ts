import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPlanMacros1763852005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('plan_days', [
      new TableColumn({ name: 'daily_carbs', type: 'numeric', isNullable: true }),
      new TableColumn({ name: 'daily_fat', type: 'numeric', isNullable: true }),
    ]);

    await queryRunner.addColumns('weekly_plans', [
      new TableColumn({ name: 'total_protein', type: 'numeric', isNullable: true }),
      new TableColumn({ name: 'total_carbs', type: 'numeric', isNullable: true }),
      new TableColumn({ name: 'total_fat', type: 'numeric', isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('plan_days', 'daily_carbs');
    await queryRunner.dropColumn('plan_days', 'daily_fat');
    await queryRunner.dropColumn('weekly_plans', 'total_protein');
    await queryRunner.dropColumn('weekly_plans', 'total_carbs');
    await queryRunner.dropColumn('weekly_plans', 'total_fat');
  }
}
