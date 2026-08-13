defmodule Easy.Repo.Migrations.PlannedItemIdDropSource do
  use Ecto.Migration

  # Diary fulfilments must survive builder deletes. The FK on
  # nutrition_meal_item_id nilified the link; replace it with planned_item_id
  # (uuid, no FK). Status derives from that id — source is gone.

  def up do
    drop_if_exists index(:nutrition_food_log_entries, [:nutrition_meal_item_id])

    drop_if_exists index(
                     :nutrition_food_log_entries,
                     [:nutrition_meal_log_id, :nutrition_meal_item_id],
                     name: :nutrition_food_log_entries_meal_log_item_index
                   )

    drop constraint(
           :nutrition_food_log_entries,
           "nutrition_food_log_entries_nutrition_meal_item_id_fkey"
         )

    rename table(:nutrition_food_log_entries), :nutrition_meal_item_id, to: :planned_item_id

    create unique_index(
             :nutrition_food_log_entries,
             [:nutrition_meal_log_id, :planned_item_id],
             where: "planned_item_id IS NOT NULL",
             name: :nutrition_food_log_entries_meal_log_planned_item_index
           )

    drop constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_source_check)

    alter table(:nutrition_food_log_entries) do
      remove :source
    end

    # Best-effort: stamp legacy freeze items from two recoverable identities.
    # Live meal items cover unfulfilled rows; retained fulfilments cover renamed
    # rows. Ranking within the same identity keeps twins mapped to distinct ids.
    execute("""
    WITH snapshot_items AS (
      SELECT
        ml.id AS meal_log_id,
        item,
        ord,
        coalesce(item->>'food_id', item->>'recipe_id', item->>'food_name') AS identity_key,
        row_number() OVER (
          PARTITION BY ml.id, coalesce(item->>'food_id', item->>'recipe_id', item->>'food_name')
          ORDER BY ord
        ) AS identity_rank,
        row_number() OVER (
          PARTITION BY ml.id, item->>'food_name'
          ORDER BY ord
        ) AS name_rank
      FROM nutrition_meal_logs AS ml,
           jsonb_array_elements(ml.planned_snapshot->'items') WITH ORDINALITY AS t(item, ord)
      WHERE ml.planned_snapshot ? 'items'
        AND ml.nutrition_meal_id IS NOT NULL
    ),
    live_items AS (
      SELECT
        ml.id AS meal_log_id,
        mi.id,
        mi.food_id,
        mi.recipe_id,
        coalesce(mi.food_id::text, mi.recipe_id::text, f.name, r.name) AS identity_key,
        coalesce(f.name, r.name) AS item_name,
        row_number() OVER (
          PARTITION BY ml.id, coalesce(mi.food_id::text, mi.recipe_id::text, f.name, r.name)
          ORDER BY mi.position, mi.inserted_at, mi.id
        ) AS identity_rank,
        row_number() OVER (
          PARTITION BY ml.id, coalesce(f.name, r.name)
          ORDER BY mi.position, mi.inserted_at, mi.id
        ) AS name_rank
      FROM nutrition_meal_logs AS ml
      JOIN nutrition_meal_items AS mi ON mi.nutrition_meal_id = ml.nutrition_meal_id
      LEFT JOIN nutrition_foods AS f ON f.id = mi.food_id
      LEFT JOIN nutrition_recipes AS r ON r.id = mi.recipe_id
    ),
    fulfilments AS (
      SELECT
        e.nutrition_meal_log_id AS meal_log_id,
        e.planned_item_id AS id,
        mi.food_id,
        mi.recipe_id,
        e.food_name,
        row_number() OVER (
          PARTITION BY e.nutrition_meal_log_id, e.food_name
          ORDER BY mi.position, mi.inserted_at, mi.id
        ) AS name_rank
      FROM nutrition_food_log_entries AS e
      JOIN nutrition_meal_items AS mi ON mi.id = e.planned_item_id
      WHERE e.planned_item_id IS NOT NULL
    ),
    rebuilt AS (
      SELECT
        snapshot.meal_log_id,
        jsonb_agg(
          CASE
            WHEN snapshot.item ? 'id' AND NULLIF(snapshot.item->>'id', '') IS NOT NULL THEN snapshot.item
            ELSE snapshot.item || jsonb_strip_nulls(jsonb_build_object(
              'id', coalesce(live.id, fulfilment.id),
              'food_id', coalesce(live.food_id, fulfilment.food_id),
              'recipe_id', coalesce(live.recipe_id, fulfilment.recipe_id)
            ))
          END
          ORDER BY snapshot.ord
        ) AS items
      FROM snapshot_items AS snapshot
      LEFT JOIN live_items AS live
        ON live.meal_log_id = snapshot.meal_log_id
       AND (
         (
           (NULLIF(snapshot.item->>'food_id', '') IS NOT NULL OR NULLIF(snapshot.item->>'recipe_id', '') IS NOT NULL)
           AND live.identity_key = snapshot.identity_key
           AND live.identity_rank = snapshot.identity_rank
         )
         OR (
           NULLIF(snapshot.item->>'food_id', '') IS NULL
           AND NULLIF(snapshot.item->>'recipe_id', '') IS NULL
           AND live.item_name = snapshot.item->>'food_name'
           AND live.name_rank = snapshot.name_rank
         )
       )
      LEFT JOIN fulfilments AS fulfilment
        ON fulfilment.meal_log_id = snapshot.meal_log_id
       AND fulfilment.food_name = snapshot.item->>'food_name'
       AND fulfilment.name_rank = snapshot.name_rank
      GROUP BY snapshot.meal_log_id
    )
    UPDATE nutrition_meal_logs AS ml
    SET planned_snapshot = jsonb_set(ml.planned_snapshot, '{items}', rebuilt.items)
    FROM rebuilt
    WHERE rebuilt.meal_log_id = ml.id
    """)
  end

  def down do
    alter table(:nutrition_food_log_entries) do
      add :source, :string, default: "planned"
    end

    execute("UPDATE nutrition_food_log_entries SET source = 'planned' WHERE source IS NULL")

    create constraint(:nutrition_food_log_entries, :nutrition_food_log_entries_source_check,
             check: "source IN ('planned', 'replacement', 'unplanned')"
           )

    drop_if_exists index(:nutrition_food_log_entries, [:nutrition_meal_log_id, :planned_item_id],
                     name: :nutrition_food_log_entries_meal_log_planned_item_index
                   )

    rename table(:nutrition_food_log_entries), :planned_item_id, to: :nutrition_meal_item_id

    alter table(:nutrition_food_log_entries) do
      modify :nutrition_meal_item_id,
             references(:nutrition_meal_items, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:nutrition_food_log_entries, [:nutrition_meal_item_id])

    create unique_index(
             :nutrition_food_log_entries,
             [:nutrition_meal_log_id, :nutrition_meal_item_id],
             where: "nutrition_meal_item_id IS NOT NULL",
             name: :nutrition_food_log_entries_meal_log_item_index
           )
  end
end
