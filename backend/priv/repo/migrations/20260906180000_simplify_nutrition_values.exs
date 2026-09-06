defmodule Easy.Repo.Migrations.SimplifyNutritionValues do
  use Ecto.Migration

  @snapshots [:nutrition_diary_frozen_planned_items, :nutrition_diary_entries]
  @targets [:target_calories, :target_protein_g, :target_carbs_g, :target_fat_g, :target_fiber_g]

  def up do
    create table(:nutrition_diary_days, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
      add :local_date, :date, null: false
      for field <- @targets, do: add(field, :float)
      timestamps(type: :utc_datetime)
    end

    create constraint(:nutrition_diary_days, :nutrition_diary_days_targets_check,
             check: Enum.map_join(@targets, " AND ", &"(#{&1} IS NULL OR #{&1} >= 0)")
           )

    create unique_index(:nutrition_diary_days, [:business_id, :client_id, :local_date])
    create unique_index(:nutrition_diary_days, [:id, :business_id, :client_id, :local_date])

    execute """
    ALTER TABLE nutrition_diary_days ADD CONSTRAINT nutrition_diary_days_client_business_fkey
    FOREIGN KEY (client_id, business_id) REFERENCES clients(id, business_id) ON DELETE CASCADE
    """

    # A day has one target snapshot. Prefer the earliest covered slot when
    # historical slots disagree, then use the immutable slot ID as a tie-break.
    execute """
    INSERT INTO nutrition_diary_days
      (id, business_id, client_id, local_date, #{Enum.join(@targets, ", ")}, inserted_at, updated_at)
    SELECT gen_random_uuid(), business_id, client_id, local_date, #{Enum.join(@targets, ", ")}, inserted_at, updated_at
    FROM (
      SELECT DISTINCT ON (business_id, client_id, local_date) *
      FROM nutrition_diary_slots
      ORDER BY business_id, client_id, local_date, has_coverage DESC, inserted_at, id
    ) slots
    """

    alter table(:nutrition_diary_slots) do
      add :nutrition_diary_day_id, :binary_id
    end

    execute """
    UPDATE nutrition_diary_slots s SET nutrition_diary_day_id = d.id
    FROM nutrition_diary_days d
    WHERE d.business_id = s.business_id AND d.client_id = s.client_id AND d.local_date = s.local_date
    """

    alter table(:nutrition_diary_slots) do
      modify :nutrition_diary_day_id, :binary_id, null: false
      for field <- @targets, do: remove(field)
    end

    execute """
    ALTER TABLE nutrition_diary_slots ADD CONSTRAINT nutrition_diary_slots_day_identity_fkey
    FOREIGN KEY (nutrition_diary_day_id, business_id, client_id, local_date)
    REFERENCES nutrition_diary_days(id, business_id, client_id, local_date) ON DELETE CASCADE
    """

    for table <- @snapshots do
      alter table(table) do
        add :nutrients, :map
      end

      execute """
      UPDATE #{table} SET nutrients = jsonb_build_object(
        'calories', calories, 'protein', protein, 'carbohydrates', carbohydrates, 'fat', fat, 'fiber', fiber)
      """

      alter table(table) do
        modify :nutrients, :map, null: false
        remove :food_id
        remove :recipe_id
        remove :kind
        remove :complete
        for field <- [:calories, :protein, :carbohydrates, :fat, :fiber], do: remove(field)
      end

      create constraint(table, "#{table}_nutrients_check", check: nutrients_check())

      rename table(table), :source_food_id, to: :food_id
      rename table(table), :source_recipe_id, to: :recipe_id

      create constraint(table, "#{table}_source_identity_check",
               check: "(food_id IS NULL) <> (recipe_id IS NULL)"
             )
    end

    for table <- @snapshots ++ [:nutrition_recipe_ingredients] do
      alter table(table) do
        add :portion, :map
      end

      execute """
      UPDATE #{table} SET portion = CASE WHEN portion_kind = 'gram'
        THEN jsonb_build_object('kind', 'gram', 'grams', weight_g)
        ELSE jsonb_build_object('kind', 'serving', 'grams', weight_g, 'amount', amount, 'unit', unit, 'label', serving_label)
      END
      """

      alter table(table) do
        modify :portion, :map, null: false
        for field <- [:portion_kind, :weight_g, :amount, :unit, :serving_label], do: remove(field)
      end

      create constraint(table, "#{table}_portion_check", check: portion_check())
    end

    execute "UPDATE nutrition_recipe_ingredients SET portion = portion - 'grams' WHERE portion->>'kind' = 'serving'"

    execute """
    UPDATE nutrition_plans SET menu = jsonb_set(menu, '{meals}', (
      SELECT coalesce(jsonb_agg(jsonb_set(meal, '{meal_items}', (
        SELECT coalesce(jsonb_agg(item - 'kind' - 'nutrients' - 'weight_g' - 'name' ORDER BY item_pos), '[]'::jsonb)
        FROM jsonb_array_elements(meal->'meal_items') WITH ORDINALITY AS items(item, item_pos)
      )) ORDER BY meal_pos), '[]'::jsonb)
      FROM jsonb_array_elements(menu->'meals') WITH ORDINALITY AS meals(meal, meal_pos)
    ))
    """

    alter table(:library_media) do
      add :external_url, :text
      modify :business_id, :binary_id, null: true
      modify :storage_key, :string, null: true
      modify :content_type, :string, null: true
      modify :byte_size, :bigint, null: true
    end

    create constraint(:library_media, :library_media_source_check,
             check: """
             ((external_url IS NOT NULL AND external_url ~ '^https?://' AND storage_key IS NULL AND uploaded_by_type = 'system')
             OR (external_url IS NULL AND storage_key IS NOT NULL AND business_id IS NOT NULL
                 AND content_type IS NOT NULL AND byte_size > 0)) IS TRUE
             """
           )

    drop constraint(:nutrition_foods, :nutrition_foods_business_media_check)

    execute """
    WITH images AS (
      SELECT id AS food_id, gen_random_uuid() AS media_id, business_id, image_url, inserted_at, updated_at
      FROM nutrition_foods WHERE image_url IS NOT NULL AND image_url <> '' AND media_id IS NULL
    ), media AS (
      INSERT INTO library_media (id, business_id, uploaded_by_type, external_url, inserted_at, updated_at)
      SELECT media_id, business_id, 'system', image_url, inserted_at, updated_at FROM images
      RETURNING id
    )
    UPDATE nutrition_foods f SET media_id = images.media_id FROM images JOIN media ON media.id = images.media_id
    WHERE f.id = images.food_id
    """

    execute "UPDATE nutrition_foods SET source = CASE WHEN business_id IS NULL THEN 'system' ELSE 'custom' END WHERE source = 'imported'"

    alter table(:nutrition_foods) do
      remove :barcode
      remove :import_id
      remove :image_url
    end
  end

  defp nutrients_check do
    fields = ~w(calories protein carbohydrates fat fiber)

    values =
      Enum.map_join(fields, " AND ", fn field ->
        "(jsonb_typeof(nutrients->'#{field}') = 'null' OR (jsonb_typeof(nutrients->'#{field}') = 'number' AND (nutrients->>'#{field}')::float >= 0))"
      end)

    "(jsonb_typeof(nutrients) = 'object' AND nutrients ?& ARRAY['calories','protein','carbohydrates','fat','fiber'] AND #{values}) IS TRUE"
  end

  defp portion_check do
    """
    (jsonb_typeof(portion) = 'object' AND (
      (portion->>'kind' = 'gram' AND jsonb_typeof(portion->'grams') = 'number' AND (portion->>'grams')::float > 0)
      OR (portion->>'kind' = 'serving' AND jsonb_typeof(portion->'amount') = 'number'
          AND (portion->>'amount')::float > 0 AND jsonb_typeof(portion->'unit') = 'string'
          AND length(portion->>'unit') > 0
          AND (NOT portion ? 'label' OR jsonb_typeof(portion->'label') IN ('string','null'))
          AND (NOT portion ? 'grams' OR jsonb_typeof(portion->'grams') = 'null'
               OR (jsonb_typeof(portion->'grams') = 'number' AND (portion->>'grams')::float > 0)))
    )) IS TRUE
    """
  end

  def down do
    raise "Nutrition value simplification is forward-only; restore the database backup with its matching release"
  end
end
