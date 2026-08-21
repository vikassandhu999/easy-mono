defmodule Easy.Repo.Migrations.AddNutritionMealOptions do
  use Ecto.Migration

  def up do
    create table(:nutrition_meal_options, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :meal_slot, :string, null: false
      add :position, :integer, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_plan_id, :binary_id, null: false
      add :nutrition_day_pattern_id, :binary_id, null: false
      add :nutrition_meal_id, :binary_id, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_meal_options, [
             :id,
             :nutrition_day_pattern_id,
             :nutrition_plan_id,
             :business_id
           ])

    create unique_index(
             :nutrition_meal_options,
             [:nutrition_day_pattern_id, :meal_slot, :position],
             name: :nutrition_meal_options_pattern_slot_position_index
           )

    create unique_index(
             :nutrition_meal_options,
             [:nutrition_day_pattern_id, :meal_slot, :nutrition_meal_id],
             name: :nutrition_meal_options_pattern_slot_meal_index
           )

    create index(:nutrition_meal_options, [:business_id])
    create index(:nutrition_meal_options, [:nutrition_plan_id])

    create constraint(:nutrition_meal_options, :nutrition_meal_options_position_check,
             check: "position >= 0"
           )

    create constraint(:nutrition_meal_options, :nutrition_meal_options_meal_slot_check,
             check: """
             meal_slot in (
               'early_morning','breakfast','mid_morning','lunch','afternoon','evening','dinner','pre_sleep',
               'pre_workout','during_workout','post_workout'
             )
             """
           )

    execute("""
    ALTER TABLE nutrition_meal_options
    ADD CONSTRAINT nutrition_meal_options_pattern_plan_business_id_fkey
    FOREIGN KEY (nutrition_day_pattern_id, nutrition_plan_id, business_id)
    REFERENCES nutrition_day_patterns(id, nutrition_plan_id, business_id)
    ON DELETE CASCADE
    """)

    execute("""
    ALTER TABLE nutrition_meal_options
    ADD CONSTRAINT nutrition_meal_options_meal_plan_business_id_fkey
    FOREIGN KEY (nutrition_meal_id, nutrition_plan_id, business_id)
    REFERENCES nutrition_meals(id, nutrition_plan_id, business_id)
    ON DELETE CASCADE
    """)

    execute("""
    CREATE FUNCTION nutrition_week_schedule_must_be_complete()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      target_plan_id uuid;
      weekday_count integer;
    BEGIN
      target_plan_id := COALESCE(NEW.nutrition_plan_id, OLD.nutrition_plan_id);

      SELECT COUNT(*) INTO weekday_count
      FROM nutrition_week_schedule
      WHERE nutrition_plan_id = target_plan_id;

      IF weekday_count <> 7 THEN
        RAISE EXCEPTION 'nutrition_week_schedule must contain every weekday'
          USING ERRCODE = 'check_violation';
      END IF;

      RETURN NULL;
    END;
    $$
    """)

    execute("""
    CREATE CONSTRAINT TRIGGER nutrition_week_schedule_complete
    AFTER INSERT OR UPDATE OR DELETE ON nutrition_week_schedule
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE PROCEDURE nutrition_week_schedule_must_be_complete()
    """)
  end

  def down do
    execute("DROP TRIGGER IF EXISTS nutrition_week_schedule_complete ON nutrition_week_schedule")
    execute("DROP FUNCTION IF EXISTS nutrition_week_schedule_must_be_complete()")
    drop table(:nutrition_meal_options)
  end
end
