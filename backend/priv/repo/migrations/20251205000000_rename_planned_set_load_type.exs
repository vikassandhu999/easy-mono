defmodule Easy.Repo.Migrations.RenamePlannedSetLoadType do
  use Ecto.Migration

  def up do
    # Rename load_type to load_unit in the JSONB array
    # Map values:
    # absolute_kg -> kg
    # absolute_lbs -> lbs
    # rpe -> none (or keep RPE in notes/intensity_target if really needed, but plan says none)
    # percent_1rm -> percent_1rm (unchanged)
    # bodyweight -> bodyweight (unchanged)

    execute """
    UPDATE workout_elements
    SET planned_sets = (
      SELECT jsonb_agg(
        element - 'load_type' || jsonb_build_object('load_unit',
          CASE element->>'load_type'
            WHEN 'absolute_kg' THEN 'kg'
            WHEN 'absolute_lbs' THEN 'lbs'
            WHEN 'rpe' THEN 'none'
            WHEN 'percent_1rm' THEN 'percent_1rm'
            WHEN 'bodyweight' THEN 'bodyweight'
            ELSE 'none'
          END
        )
      )
      FROM jsonb_array_elements(planned_sets) AS element
    )
    WHERE planned_sets IS NOT NULL AND jsonb_array_length(planned_sets) > 0;
    """
  end

  def down do
    # Revert load_unit back to load_type
    # kg -> absolute_kg
    # lbs -> absolute_lbs
    # percent_1rm -> percent_1rm
    # bodyweight -> bodyweight
    # none -> none (lossy for rpe)

    execute """
    UPDATE workout_elements
    SET planned_sets = (
      SELECT jsonb_agg(
        element - 'load_unit' || jsonb_build_object('load_type',
          CASE element->>'load_unit'
            WHEN 'kg' THEN 'absolute_kg'
            WHEN 'lbs' THEN 'absolute_lbs'
            WHEN 'percent_1rm' THEN 'percent_1rm'
            WHEN 'bodyweight' THEN 'bodyweight'
            ELSE 'none'
          END
        )
      )
      FROM jsonb_array_elements(planned_sets) AS element
    )
    WHERE planned_sets IS NOT NULL AND jsonb_array_length(planned_sets) > 0;
    """
  end
end
