defmodule Easy.Repo.Migrations.StoreDiarySlotDocuments do
  use Ecto.Migration

  def up do
    alter table(:nutrition_diary_slots) do
      add :document, :map
    end

    execute """
    UPDATE nutrition_diary_slots s SET document = jsonb_build_object(
      'meal_id', (SELECT source_meal_id FROM nutrition_diary_frozen_options
        WHERE nutrition_diary_slot_id = s.id
        ORDER BY (id = s.active_frozen_option_id) DESC NULLS LAST, position, id LIMIT 1),
      'options', coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', o.source_meal_id, 'name', o.meal_name,
          'items', coalesce((SELECT jsonb_agg(jsonb_build_object(
            'id', i.source_meal_item_id, 'name', i.display_name,
            'food_id', i.food_id, 'recipe_id', i.recipe_id, 'portion', i.portion, 'nutrients', i.nutrients
          ) ORDER BY i.position, i.id) FROM nutrition_diary_frozen_planned_items i
            WHERE i.nutrition_diary_frozen_option_id = o.id), '[]'::jsonb)
        ) ORDER BY o.position, o.id) FROM nutrition_diary_frozen_options o
        WHERE o.nutrition_diary_slot_id = s.id
      ), '[]'::jsonb),
      'entries', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', e.id, 'name', e.display_name, 'food_id', e.food_id, 'recipe_id', e.recipe_id,
          'portion', e.portion, 'nutrients', e.nutrients, 'notes', e.notes,
          'planned_item_ref', (SELECT source_meal_item_id FROM nutrition_diary_frozen_planned_items WHERE id = e.frozen_planned_item_id)
        ) ORDER BY e.inserted_at, e.id) FROM nutrition_diary_entries e WHERE e.nutrition_diary_slot_id = s.id
      ), '[]'::jsonb)
    )
    """

    alter table(:nutrition_diary_slots) do
      modify :document, :map, null: false
      remove :active_frozen_option_id
    end

    create constraint(:nutrition_diary_slots, :nutrition_diary_slots_document_check,
             check: """
             (jsonb_typeof(document) = 'object' AND document ?& ARRAY['meal_id','options','entries']
               AND jsonb_typeof(document->'options') = 'array' AND jsonb_typeof(document->'entries') = 'array'
               AND jsonb_typeof(document->'meal_id') IN ('string','null')) IS TRUE
             """
           )

    drop table(:nutrition_diary_entries)
    drop table(:nutrition_diary_frozen_planned_items)
    drop table(:nutrition_diary_frozen_options)
    drop index(:nutrition_diary_slots, [:id, :business_id])
  end

  def down do
    raise "Diary slot documents are forward-only; restore the database backup with its matching release"
  end
end
