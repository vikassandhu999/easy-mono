defmodule Easy.Nutrition.MenuDocumentMigrationTest do
  use Easy.DataCase, async: false

  alias Easy.Nutrition.Menu
  alias Ecto.Migration.Runner

  setup do
    schema = "menu_migration_#{System.unique_integer([:positive])}"
    Repo.query!(~s(CREATE SCHEMA "#{schema}"))
    Repo.query!(~s(SET LOCAL search_path TO "#{schema}"))

    for sql <- [
          "CREATE TABLE nutrition_plans (id uuid PRIMARY KEY, business_id uuid, name text, kind text, revision integer, start_date date, end_date date)",
          "CREATE TABLE nutrition_foods (id uuid PRIMARY KEY, business_id uuid)",
          "CREATE TABLE nutrition_recipes (id uuid PRIMARY KEY, business_id uuid)",
          "CREATE TABLE nutrition_meals (id uuid PRIMARY KEY, nutrition_plan_id uuid, name text, notes text, position integer)",
          "CREATE TABLE nutrition_meal_items (id uuid PRIMARY KEY, nutrition_plan_id uuid, nutrition_meal_id uuid, food_id uuid, recipe_id uuid, portion_kind text, weight_g double precision, amount double precision, unit text, serving_label text, position integer, calories double precision, protein double precision, carbohydrates double precision, fat double precision, fiber double precision, complete boolean)",
          "CREATE TABLE nutrition_day_patterns (id uuid PRIMARY KEY, nutrition_plan_id uuid, name text, position integer)",
          "CREATE TABLE nutrition_meal_options (id uuid PRIMARY KEY, nutrition_plan_id uuid, nutrition_day_pattern_id uuid, nutrition_meal_id uuid, meal_slot text, position integer)",
          "CREATE TABLE nutrition_week_schedule (nutrition_plan_id uuid, nutrition_day_pattern_id uuid, weekday text)",
          "CREATE FUNCTION nutrition_week_schedule_must_be_complete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$",
          "CREATE CONSTRAINT TRIGGER nutrition_week_schedule_complete AFTER INSERT OR UPDATE OR DELETE ON nutrition_week_schedule DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nutrition_week_schedule_must_be_complete()",
          "CREATE TABLE nutrition_diary_frozen_options (id uuid PRIMARY KEY, nutrition_meal_id uuid REFERENCES nutrition_meals(id), source_meal_id uuid, meal_name text)",
          "CREATE TABLE nutrition_diary_frozen_planned_items (id uuid PRIMARY KEY, source_meal_item_id uuid, nutrition_diary_frozen_option_id uuid REFERENCES nutrition_diary_frozen_options(id), display_name text, calories double precision)",
          "CREATE TABLE nutrition_diary_entries (id uuid PRIMARY KEY, frozen_planned_item_id uuid REFERENCES nutrition_diary_frozen_planned_items(id), calories double precision)",
          "CREATE TABLE nutrition_diary_slots (id uuid PRIMARY KEY, revision integer)",
          "CREATE TABLE nutrition_recipe_ingredients (id uuid PRIMARY KEY)"
        ],
        do: Repo.query!(sql)

    ids =
      Map.new(
        ~w(
          plan business food recipe meal_a meal_b item_a item_b
          day_a day_b frozen_option frozen_item entry slot
        )a,
        &{&1, Ecto.UUID.generate()}
      )

    raw = Map.new(ids, fn {key, id} -> {key, Ecto.UUID.dump!(id)} end)
    Repo.query!("INSERT INTO nutrition_plans VALUES ($1,$2,'Prescription','client_plan',7,'2026-09-01',NULL)", [raw.plan, raw.business])
    Repo.query!("INSERT INTO nutrition_foods VALUES ($1,$2)", [raw.food, raw.business])
    Repo.query!("INSERT INTO nutrition_recipes VALUES ($1,$2)", [raw.recipe, raw.business])
    Repo.query!("INSERT INTO nutrition_meals VALUES ($1,$3,'Oats','Keep notes',40), ($2,$3,'Recipe',NULL,10)", [raw.meal_a, raw.meal_b, raw.plan])

    Repo.query!(
      "INSERT INTO nutrition_meal_items (id,nutrition_plan_id,nutrition_meal_id,food_id,portion_kind,weight_g,position,calories,protein,complete) VALUES ($1,$2,$3,$4,'gram',50,20,16.6666666667,NULL,false)",
      [raw.item_a, raw.plan, raw.meal_a, raw.food]
    )

    Repo.query!(
      "INSERT INTO nutrition_meal_items (id,nutrition_plan_id,nutrition_meal_id,recipe_id,portion_kind,amount,unit,serving_label,position,calories,complete) VALUES ($1,$2,$3,$4,'serving',1.25,'serving',NULL,0,101.123456789,false)",
      [raw.item_b, raw.plan, raw.meal_b, raw.recipe]
    )

    Repo.query!("INSERT INTO nutrition_day_patterns VALUES ($1,$3,'Training',20), ($2,$3,'Rest',10)", [raw.day_a, raw.day_b, raw.plan])

    choices = [
      {raw.day_a, "breakfast", raw.meal_a, 20},
      {raw.day_a, "breakfast", raw.meal_b, 0},
      {raw.day_b, "lunch", raw.meal_a, 0}
    ]

    for {day, slot, meal, position} <- choices do
      Repo.query!("INSERT INTO nutrition_meal_options VALUES ($1,$2,$3,$4,$5,$6)", [Ecto.UUID.dump!(Ecto.UUID.generate()), raw.plan, day, meal, slot, position])
    end

    for weekday <- Menu.weekdays() do
      day = if weekday in [:saturday, :sunday], do: raw.day_b, else: raw.day_a
      Repo.query!("INSERT INTO nutrition_week_schedule VALUES ($1,$2,$3)", [raw.plan, day, to_string(weekday)])
    end

    Repo.query!("INSERT INTO nutrition_diary_frozen_options VALUES ($1,$2,$2,'Historical oats')", [raw.frozen_option, raw.meal_a])
    Repo.query!("INSERT INTO nutrition_diary_frozen_planned_items VALUES ($1,$2,$3,'Historical food',99.12345)", [raw.frozen_item, raw.item_a, raw.frozen_option])
    Repo.query!("INSERT INTO nutrition_diary_entries VALUES ($1,$2,49.561725)", [raw.entry, raw.frozen_item])
    Repo.query!("INSERT INTO nutrition_diary_slots VALUES ($1,3)", [raw.slot])
    Repo.query!("SET CONSTRAINTS ALL IMMEDIATE")
    %{schema: schema, ids: ids, raw: raw}
  end

  test "backfills saved menus and diary links before removing the relational menu", c do
    migrate(c.schema)
    [[7, "client_plan", ~D[2026-09-01], nil, document]] = Repo.query!("SELECT revision,kind,start_date,end_date,menu FROM nutrition_plans").rows
    [recipe, oats] = document["meals"]
    assert [recipe["id"], oats["id"]] == [c.ids.meal_b, c.ids.meal_a]
    assert oats["notes"] == "Keep notes"
    [oats_item] = oats["meal_items"]
    assert oats_item["id"] == c.ids.item_a
    assert oats_item["weight_g"] == 50.0
    assert oats_item["nutrients"]["calories"] == 16.6666666667
    assert oats_item["nutrients"]["protein"] == nil
    refute oats_item["nutrients"]["complete"]
    [recipe_item] = recipe["meal_items"]
    assert recipe_item["weight_g"] == nil
    assert recipe_item["portion"] == %{"kind" => "serving", "amount" => 1.25, "unit" => "serving", "label" => nil}
    assert recipe_item["nutrients"]["calories"] == 101.123456789
    [rest, training] = document["day_patterns"]
    assert [rest["id"], training["id"]] == [c.ids.day_b, c.ids.day_a]
    assert hd(training["slots"])["meal_ids"] == [c.ids.meal_b, c.ids.meal_a]
    assert hd(rest["slots"])["meal_ids"] == [c.ids.meal_a]
    assert document["schedule"]["monday"] == c.ids.day_a
    assert document["schedule"]["sunday"] == c.ids.day_b
    assert map_size(document["schedule"]) == 7
    assert {:ok, _} = Menu.cast(document)
    assert %Menu{} = Ecto.embedded_load(Menu, document, :json)

    assert [[c.raw.frozen_option, c.raw.meal_a, "Historical oats"]] == Repo.query!("SELECT id,source_meal_id,meal_name FROM nutrition_diary_frozen_options").rows

    assert [[c.raw.frozen_item, c.raw.item_a, c.raw.frozen_option, 99.12345]] ==
             Repo.query!("SELECT id,source_meal_item_id,nutrition_diary_frozen_option_id,calories FROM nutrition_diary_frozen_planned_items").rows

    assert [[c.raw.entry, c.raw.frozen_item, 49.561725]] == Repo.query!("SELECT id,frozen_planned_item_id,calories FROM nutrition_diary_entries").rows
    assert [[3]] == Repo.query!("SELECT revision FROM nutrition_diary_slots").rows
    assert [[8]] == Repo.query!("SELECT count(*) FROM pg_tables WHERE schemaname = current_schema() AND tablename LIKE 'nutrition_%'").rows
    assert [[nil]] == Repo.query!("SELECT to_regprocedure('nutrition_week_schedule_must_be_complete()')").rows

    assert [[0]] ==
             Repo.query!(
               "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'nutrition_diary_frozen_options' AND column_name = 'nutrition_meal_id'"
             ).rows
  end

  for corruption <- [:schedule, :library] do
    @corruption corruption
    test "invalid #{@corruption} data aborts before deleting any menu rows", c do
      case @corruption do
        :schedule -> Repo.query!("DELETE FROM nutrition_week_schedule WHERE weekday = 'monday'")
        :library -> Repo.query!("UPDATE nutrition_foods SET business_id = $1", [Ecto.UUID.dump!(Ecto.UUID.generate())])
      end

      assert_raise Postgrex.Error, ~r/Cannot migrate nutrition menu for plan/, fn -> migrate(c.schema) end
      assert [[2]] == Repo.query!("SELECT count(*) FROM nutrition_meal_items").rows
      assert [[1]] == Repo.query!("SELECT count(*) FROM nutrition_diary_entries").rows
    end
  end

  defp migrate(schema) do
    migration = Easy.Repo.Migrations.StoreNutritionMenuDocuments
    unless Code.ensure_loaded?(migration), do: Code.require_file("priv/repo/migrations/20260906140000_store_nutrition_menu_documents.exs")
    Runner.run(Repo, Repo.config(), 20_260_906_140_000, migration, :forward, :up, :up, log: false, prefix: schema)
  end
end
