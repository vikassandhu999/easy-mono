defmodule Easy.Repo.Migrations.SharedNutrients do
  use Ecto.Migration

  # The nutrient catalogue is one shared registry (N21), like built-in exercises (W35): no business, `code` is the key.
  @nutrients [
    {"energy_kcal", "Energy", "kcal"},
    {"protein_g", "Protein", "g"},
    {"carbs_g", "Carbs (total)", "g"},
    {"fat_g", "Fat", "g"},
    {"fiber_g", "Fiber", "g"},
    {"sugar_g", "Sugar", "g"},
    {"sodium_mg", "Sodium", "mg"},
    {"calcium_mg", "Calcium", "mg"},
    {"iron_mg", "Iron", "mg"},
    {"potassium_mg", "Potassium", "mg"},
    {"vitamin_c_mg", "Vitamin C", "mg"},
    {"vitamin_d_ug", "Vitamin D", "µg"}
  ]

  def up do
    execute("ALTER TABLE foods DROP CONSTRAINT foods_nutrients_valid")
    execute("ALTER TABLE nutrition_targets DROP CONSTRAINT nutrition_targets_values_valid")
    execute("DROP FUNCTION nutrition_json_valid(jsonb, uuid, boolean)")
    execute("DROP TABLE nutrients")

    execute("""
    CREATE TABLE nutrients (
      code text PRIMARY KEY CHECK(code ~ '^[a-z0-9_]+$'),
      name text NOT NULL CHECK(btrim(name)<>''), unit text NOT NULL CHECK(btrim(unit)<>''),
      position integer NOT NULL UNIQUE CHECK(position>=0)
    )
    """)

    for {{code, name, unit}, position} <- Enum.with_index(@nutrients) do
      execute(
        "INSERT INTO nutrients(code,name,unit,position) VALUES ('#{code}','#{name}','#{unit}',#{position})"
      )
    end

    execute("""
    CREATE FUNCTION nutrition_json_valid(value jsonb, bounds boolean) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
    DECLARE entry record; lo numeric; hi numeric;
    BEGIN
      IF jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
      FOR entry IN SELECT * FROM jsonb_each(value) LOOP
        IF NOT EXISTS(SELECT 1 FROM nutrients WHERE code=entry.key) THEN RETURN false; END IF;
        IF bounds THEN
          IF jsonb_typeof(entry.value)<>'object' OR entry.value='{}' OR (entry.value-'min'-'max')<>'{}' THEN RETURN false; END IF;
          IF entry.value ? 'min' AND (jsonb_typeof(entry.value->'min')<>'number' OR (entry.value->>'min')::numeric<0) THEN RETURN false; END IF;
          IF entry.value ? 'max' AND (jsonb_typeof(entry.value->'max')<>'number' OR (entry.value->>'max')::numeric<0) THEN RETURN false; END IF;
          lo=(entry.value->>'min')::numeric; hi=(entry.value->>'max')::numeric;
          IF lo IS NOT NULL AND hi IS NOT NULL AND lo>hi THEN RETURN false; END IF;
        ELSE
          IF jsonb_typeof(entry.value)<>'number' OR (entry.value::text)::numeric<0 THEN RETURN false; END IF;
        END IF;
      END LOOP;
      RETURN true;
    END $$
    """)

    execute(
      "ALTER TABLE foods ADD CONSTRAINT foods_nutrients_valid CHECK(nutrition_json_valid(nutrients,false))"
    )

    execute(
      "ALTER TABLE nutrition_targets ADD CONSTRAINT nutrition_targets_values_valid CHECK(nutrition_json_valid(targets,true))"
    )
  end

  def down, do: raise("Shared nutrients are irreversible")
end
