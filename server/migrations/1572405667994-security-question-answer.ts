import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurityQuestionAnswer1572405667994 implements MigrationInterface {
  public up = async (queryRunner: QueryRunner): Promise<any> => {
    await queryRunner.query(
      `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE security_question_answer(
        id serial PRIMARY KEY,
        uuid uuid DEFAULT uuid_generate_v4(),
        actor_account_id int NOT NULL,
        security_question_id int NOT NULL,
        answer varchar NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        deleted_at timestamptz
      );
      `
    );
  };

  public down = async (queryRunner: QueryRunner): Promise<any> => {
    await queryRunner.query(
      `
      DROP TABLE IF EXISTS security_question_answer;
      `
    );
  };
}