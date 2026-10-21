defmodule Easy.Repo.Migrations.NutritionValueConstraints do
  use Ecto.Migration

  def up do
    execute("ALTER TABLE diary_entries ADD COLUMN food_components jsonb[] NOT NULL DEFAULT '{}'")

    execute("""
    CREATE FUNCTION valid_nutrients(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
      SELECT jsonb_typeof(value)='object' AND NOT EXISTS(SELECT 1 FROM jsonb_each(value) v WHERE jsonb_typeof(v.value)<>'number' OR (v.value::text)::numeric<0)
    $$
    """)

    execute(
      "ALTER TABLE foods ADD CONSTRAINT foods_nutrients_valid CHECK(valid_nutrients(nutrients))"
    )

    execute(
      "ALTER TABLE diary_entries ADD CONSTRAINT diary_entries_nutrients_valid CHECK(valid_nutrients(nutrients))"
    )

    execute(
      "ALTER TABLE diary_entries ADD CONSTRAINT diary_entries_source_valid CHECK(source IS NULL OR (source->>'type' IN ('food','recipe') AND source->>'id' IS NOT NULL))"
    )
  end

  def down, do: raise("Prototype reset required")
end
