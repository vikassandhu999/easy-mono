defmodule Easy.Repo.Migrations.AddTrainingPlanItemsUniqueIndex do
  use Ecto.Migration

  def up do
    execute("""
    WITH duplicate_primaries AS (
      SELECT
        id,
        business_id,
        training_plan_id,
        day,
        ROW_NUMBER() OVER (
          PARTITION BY business_id, training_plan_id, day, workout_type
          ORDER BY inserted_at, id
        ) AS duplicate_rank
      FROM training_plan_items
      WHERE workout_type = 'primary'
    )
    UPDATE training_plan_items item
    SET workout_type = 'alternative', updated_at = NOW()
    FROM duplicate_primaries duplicate
    WHERE item.id = duplicate.id
      AND duplicate.duplicate_rank = 2
      AND NOT EXISTS (
        SELECT 1
        FROM training_plan_items existing
        WHERE existing.business_id = duplicate.business_id
          AND existing.training_plan_id = duplicate.training_plan_id
          AND existing.day = duplicate.day
          AND existing.workout_type = 'alternative'
      )
    """)

    execute("""
    DO $$
    DECLARE
      duplicate_details text;
    BEGIN
      WITH duplicate_slots AS (
        SELECT
          business_id,
          training_plan_id,
          day,
          workout_type,
          COUNT(*) AS item_count
        FROM training_plan_items
        GROUP BY business_id, training_plan_id, day, workout_type
        HAVING COUNT(*) > 1
        ORDER BY business_id, training_plan_id, day, workout_type
        LIMIT 20
      )
      SELECT string_agg(
        format(
          'business_id=%s training_plan_id=%s day=%s workout_type=%s count=%s',
          business_id,
          training_plan_id,
          day,
          workout_type,
          item_count
        ),
        '; '
      )
      INTO duplicate_details
      FROM duplicate_slots;

      IF duplicate_details IS NOT NULL THEN
        RAISE EXCEPTION
          'training_plan_items has unsupported duplicate workout slots after normalization: %. Resolve extra same-day workouts before adding training_plan_items_plan_id_day_workout_type_index.',
          duplicate_details;
      END IF;
    END $$;
    """)

    create unique_index(:training_plan_items, [:training_plan_id, :day, :workout_type],
             name: :training_plan_items_plan_id_day_workout_type_index
           )
  end

  def down do
    drop unique_index(:training_plan_items, [:training_plan_id, :day, :workout_type],
           name: :training_plan_items_plan_id_day_workout_type_index
         )
  end
end
