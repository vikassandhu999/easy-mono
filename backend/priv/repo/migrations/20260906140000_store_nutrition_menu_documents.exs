defmodule Easy.Repo.Migrations.StoreNutritionMenuDocuments do
  use Ecto.Migration

  def up do
    alter table(:nutrition_plans) do
      add :menu, :map
    end

    execute("""
    UPDATE nutrition_plans p SET menu = jsonb_build_object(
      'meals', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', m.id, 'name', m.name, 'notes', m.notes,
          'meal_items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', i.id, 'kind', CASE WHEN i.food_id IS NOT NULL THEN 'food' ELSE 'recipe' END,
              'food_id', i.food_id, 'recipe_id', i.recipe_id, 'weight_g', i.weight_g,
              'portion', CASE WHEN i.portion_kind = 'gram'
                THEN jsonb_build_object('kind', 'gram', 'grams', i.weight_g)
                ELSE jsonb_build_object('kind', 'serving', 'amount', i.amount, 'unit', i.unit, 'label', i.serving_label)
                END,
              'nutrients', jsonb_build_object(
                'calories', i.calories, 'protein', i.protein, 'carbohydrates', i.carbohydrates,
                'fat', i.fat, 'fiber', i.fiber, 'complete', i.complete)
            ) ORDER BY i.position, i.id)
            FROM nutrition_meal_items i WHERE i.nutrition_meal_id = m.id
          ), '[]'::jsonb)
        ) ORDER BY m.position, m.id)
        FROM nutrition_meals m WHERE m.nutrition_plan_id = p.id
      ), '[]'::jsonb),
      'day_patterns', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'name', d.name,
          'slots', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('meal_slot', choices.meal_slot, 'meal_ids', choices.meal_ids)
              ORDER BY choices.meal_slot)
            FROM (
              SELECT o.meal_slot, jsonb_agg(o.nutrition_meal_id ORDER BY o.position, o.id) AS meal_ids
              FROM nutrition_meal_options o WHERE o.nutrition_day_pattern_id = d.id
              GROUP BY o.meal_slot
            ) choices
          ), '[]'::jsonb)
        ) ORDER BY d.position, d.id)
        FROM nutrition_day_patterns d WHERE d.nutrition_plan_id = p.id
      ), '[]'::jsonb),
      'schedule', COALESCE((
        SELECT jsonb_object_agg(w.weekday, w.nutrition_day_pattern_id)
        FROM nutrition_week_schedule w WHERE w.nutrition_plan_id = p.id
      ), '{}'::jsonb)
    )
    """)

    execute("""
    DO $$
    DECLARE invalid_plan uuid;
    BEGIN
      SELECT p.id INTO invalid_plan FROM nutrition_plans p
      WHERE jsonb_array_length(p.menu->'day_patterns') = 0
        OR (SELECT count(*) FROM jsonb_object_keys(p.menu->'schedule')) <> 7
        OR NOT (p.menu->'schedule' ?& ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
        OR EXISTS (
          SELECT 1 FROM jsonb_each_text(p.menu->'schedule') w
          WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.menu->'day_patterns') d WHERE d->>'id' = w.value)
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(p.menu->'day_patterns') d,
            jsonb_array_elements(d->'slots') s, jsonb_array_elements_text(s->'meal_ids') choice
          WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.menu->'meals') m WHERE m->>'id' = choice.value)
        )
        OR EXISTS (
          SELECT 1 FROM (
            SELECT m->>'id' AS id FROM jsonb_array_elements(p.menu->'meals') m
            UNION ALL
            SELECT i->>'id' FROM jsonb_array_elements(p.menu->'meals') m, jsonb_array_elements(m->'meal_items') i
            UNION ALL
            SELECT d->>'id' FROM jsonb_array_elements(p.menu->'day_patterns') d
          ) nodes GROUP BY id HAVING count(*) > 1
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(p.menu->'meals') m, jsonb_array_elements(m->'meal_items') i
          WHERE (i->>'food_id' IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM nutrition_foods f WHERE f.id = (i->>'food_id')::uuid
              AND (f.business_id = p.business_id OR f.business_id IS NULL)
          )) OR (i->>'recipe_id' IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM nutrition_recipes r WHERE r.id = (i->>'recipe_id')::uuid AND r.business_id = p.business_id
          ))
        )
        OR (SELECT count(*) FROM nutrition_meals m WHERE m.nutrition_plan_id = p.id)
          <> jsonb_array_length(p.menu->'meals')
        OR (SELECT count(*) FROM nutrition_meal_items i WHERE i.nutrition_plan_id = p.id)
          <> (SELECT count(*) FROM jsonb_array_elements(p.menu->'meals') m, jsonb_array_elements(m->'meal_items') i)
        OR (SELECT count(*) FROM nutrition_meal_options o WHERE o.nutrition_plan_id = p.id)
          <> (SELECT count(*) FROM jsonb_array_elements(p.menu->'day_patterns') d,
            jsonb_array_elements(d->'slots') s, jsonb_array_elements(s->'meal_ids') choice)
      LIMIT 1;
      IF invalid_plan IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot migrate nutrition menu for plan %', invalid_plan;
      END IF;
    END $$
    """)

    alter table(:nutrition_plans) do
      modify :menu, :map, null: false
    end

    create constraint(:nutrition_plans, :nutrition_plans_menu_shape,
             check: """
             (jsonb_typeof(menu) = 'object'
             AND jsonb_typeof(menu->'meals') = 'array'
             AND jsonb_typeof(menu->'day_patterns') = 'array'
             AND jsonb_typeof(menu->'schedule') = 'object') IS TRUE
             """
           )

    create index(:nutrition_plans, [:menu], using: :gin)

    alter table(:nutrition_diary_frozen_options) do
      remove :nutrition_meal_id
    end

    execute("DROP TRIGGER nutrition_week_schedule_complete ON nutrition_week_schedule")
    execute("DROP FUNCTION nutrition_week_schedule_must_be_complete()")
    drop table(:nutrition_week_schedule)
    drop table(:nutrition_meal_options)
    drop table(:nutrition_meal_items)
    drop table(:nutrition_day_patterns)
    drop table(:nutrition_meals)
  end

  def down do
    raise "Restore the database backup and matching application release to undo the menu document cutover"
  end
end
