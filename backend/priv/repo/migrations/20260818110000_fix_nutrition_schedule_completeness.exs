defmodule Easy.Repo.Migrations.FixNutritionScheduleCompleteness do
  use Ecto.Migration

  def up do
    execute("""
    CREATE OR REPLACE FUNCTION nutrition_week_schedule_must_be_complete()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      target_plan_id uuid;
      weekday_count integer;
    BEGIN
      target_plan_id := COALESCE(NEW.nutrition_plan_id, OLD.nutrition_plan_id);

      IF NOT EXISTS (SELECT 1 FROM nutrition_plans WHERE id = target_plan_id) THEN
        RETURN NULL;
      END IF;

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
  end

  def down do
    execute("""
    CREATE OR REPLACE FUNCTION nutrition_week_schedule_must_be_complete()
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
  end
end
