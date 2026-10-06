defmodule Easy.Repo.Migrations.CoreNutrition do
  use Ecto.Migration

  def up do
    execute(
      "DROP TABLE nutrition_diary_slots, nutrition_diary_days, nutrition_recipe_ingredients, nutrition_plans CASCADE"
    )

    execute("ALTER TABLE nutrition_foods RENAME TO foods")
    execute("ALTER TABLE foods DROP CONSTRAINT nutrition_foods_nutrients_nonnegative")

    execute(
      "ALTER TABLE foods DROP COLUMN calories_per_100g, DROP COLUMN protein_g_per_100g, DROP COLUMN carbs_g_per_100g, DROP COLUMN fat_g_per_100g, DROP COLUMN fiber_g_per_100g, DROP COLUMN sugar_g_per_100g, DROP COLUMN serving_sizes"
    )

    execute(
      "ALTER TABLE foods ADD COLUMN nutrients jsonb NOT NULL DEFAULT '{}', ADD COLUMN servings jsonb[] NOT NULL DEFAULT '{}', ADD COLUMN default_serving_id text, ADD COLUMN archived_at timestamp, ADD COLUMN tags text[] NOT NULL DEFAULT '{}'"
    )

    execute("DELETE FROM foods")
    execute("ALTER TABLE nutrition_recipes RENAME TO recipes")

    execute(
      "ALTER TABLE recipes ADD COLUMN ingredients jsonb[] NOT NULL DEFAULT '{}', ADD COLUMN archived_at timestamp, ADD COLUMN tags text[] NOT NULL DEFAULT '{}'"
    )

    execute("DELETE FROM recipes")

    execute("""
    CREATE TABLE diary_meals (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses ON DELETE CASCADE,
      client_id uuid NOT NULL, local_date date NOT NULL, timezone text NOT NULL,
      recorded_by_type text NOT NULL CHECK (recorded_by_type IN ('client','coach')), recorded_by_id uuid NOT NULL,
      request_id uuid NOT NULL, revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      domain text GENERATED ALWAYS AS ('nutrition') STORED, plan_revision_id uuid, slot_id uuid,
      name text NOT NULL CHECK (btrim(name) <> ''), chosen_meal_id uuid, note_to_coach text, shared_at timestamptz,
      FOREIGN KEY (client_id,business_id) REFERENCES clients(id,business_id) ON DELETE CASCADE,
      FOREIGN KEY (plan_revision_id,domain) REFERENCES plan_revisions(id,domain),
      CHECK ((plan_revision_id IS NULL) = (slot_id IS NULL)),
      UNIQUE(id,business_id), UNIQUE(client_id,local_date,name), UNIQUE(client_id,request_id)
    )
    """)

    execute(
      "CREATE INDEX diary_meals_client_date ON diary_meals(business_id,client_id,local_date)"
    )

    execute(
      "CREATE UNIQUE INDEX diary_meals_slot ON diary_meals(client_id,local_date,slot_id) WHERE slot_id IS NOT NULL"
    )

    execute("""
    CREATE TABLE diary_entries (
      id uuid PRIMARY KEY, business_id uuid NOT NULL, meal_id uuid NOT NULL,
      planned_item_id uuid, source jsonb, portion jsonb, name text NOT NULL,
      grams double precision CHECK (grams>0), nutrients jsonb NOT NULL,
      notes text, deleted_at timestamptz, request_id uuid NOT NULL,
      inserted_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      FOREIGN KEY(meal_id,business_id) REFERENCES diary_meals(id,business_id) ON DELETE CASCADE,
      CHECK ((source IS NULL AND portion IS NULL AND grams IS NULL) OR (source IS NOT NULL AND portion IS NOT NULL AND grams IS NOT NULL)),
      UNIQUE(meal_id,request_id)
    )
    """)

    execute(
      "CREATE INDEX diary_entries_meal ON diary_entries(business_id,meal_id) WHERE deleted_at IS NULL"
    )

    execute("""
    CREATE OR REPLACE VIEW records AS
    SELECT 'workout'::text AS kind,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM training_sessions WHERE state <> 'discarded'
    UNION ALL SELECT 'meal'::text,id,business_id,client_id,local_date,timezone,recorded_by_type,recorded_by_id,revision,inserted_at,updated_at FROM diary_meals
    """)

    execute("""
    CREATE FUNCTION expected_meals(client_ids uuid[],from_date date,to_date date)
    RETURNS TABLE(client_id uuid,plan_id uuid,plan_revision_id uuid,schedule_entry_id uuid,occurrence_date date,day_pattern_id uuid,slot_id uuid,slot_name text)
    LANGUAGE sql STABLE AS $$
      SELECT p.client_id,p.id,r.id,(e->>'id')::uuid,d::date,(pattern->>'id')::uuid,(slot->>'id')::uuid,slot->>'name'
      FROM generate_series(from_date,to_date,'1 day'::interval) d
      JOIN plans p ON p.client_id=any(client_ids) AND p.domain='nutrition' AND plan_covers(p.id,d::date)
      CROSS JOIN LATERAL (SELECT * FROM plan_revisions r WHERE r.plan_id=p.id AND (r.effective_on IS NULL OR r.effective_on<=d::date) ORDER BY r.effective_on DESC NULLS LAST,r.number DESC LIMIT 1) r
      CROSS JOIN LATERAL jsonb_array_elements(r.content->'schedule'->'entries') e
      CROSS JOIN LATERAL jsonb_array_elements(r.content->'day_patterns') pattern
      CROSS JOIN LATERAL jsonb_array_elements(pattern->'slots') slot
      WHERE (e->>'day')::integer=extract(isodow FROM d)::integer-1 AND pattern->>'id'=e->>'ref';
    $$
    """)
  end

  def down, do: raise("Prototype reset required")
end
