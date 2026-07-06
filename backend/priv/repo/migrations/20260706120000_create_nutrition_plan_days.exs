defmodule Easy.Repo.Migrations.CreateNutritionPlanDays do
  use Ecto.Migration

  def up do
    create table(:nutrition_plan_days, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :position, :integer, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_plan_id,
          references(:nutrition_plans, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_plan_days, [:nutrition_plan_id, :position])
    create index(:nutrition_plan_days, [:business_id])

    create table(:nutrition_day_meals, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :meal_slot, :string, null: false
      add :position, :integer, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_plan_day_id,
          references(:nutrition_plan_days, type: :binary_id, on_delete: :delete_all), null: false

      add :nutrition_meal_id,
          references(:nutrition_meals, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_day_meals, [:nutrition_plan_day_id, :meal_slot, :position],
             name: :nutrition_day_meals_day_slot_position_index
           )

    create index(:nutrition_day_meals, [:business_id])
    create index(:nutrition_day_meals, [:nutrition_meal_id])

    create table(:nutrition_weekday_assignments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :day_of_week, :string, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_plan_id,
          references(:nutrition_plans, type: :binary_id, on_delete: :delete_all), null: false

      add :nutrition_plan_day_id,
          references(:nutrition_plan_days, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_weekday_assignments, [:nutrition_plan_id, :day_of_week],
             name: :nutrition_weekday_assignments_plan_day_of_week_index
           )

    create index(:nutrition_weekday_assignments, [:business_id])

    flush()
    backfill()
  end

  def down do
    drop table(:nutrition_weekday_assignments)
    drop table(:nutrition_day_meals)
    drop table(:nutrition_plan_days)
  end

  @weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)

  # Group each plan's weekdays by identical (slot -> meal_id) signature.
  # One group -> a single "Everyday" day; N groups -> "Day 1".."Day N".
  # Weekdays with no entries join the largest group. Plans with no entries
  # get one "Everyday" day owning all 7 weekdays.
  defp backfill do
    %{rows: plans} =
      repo().query!("SELECT id, business_id FROM nutrition_plans", [])

    Enum.each(plans, fn [plan_id, business_id] ->
      %{rows: entries} =
        repo().query!(
          "SELECT day_of_week, meal_slot, nutrition_meal_id FROM nutrition_schedule_entries WHERE nutrition_plan_id = $1",
          [plan_id]
        )

      by_day = Enum.group_by(entries, fn [day, _slot, _meal] -> day end)

      signature = fn day ->
        by_day
        |> Map.get(day, [])
        |> Enum.map(fn [_d, slot, meal] -> {slot, meal} end)
        |> Enum.sort()
      end

      groups =
        @weekdays
        |> Enum.group_by(signature)
        |> Enum.sort_by(fn {_sig, days} -> -length(days) end)

      groups =
        case groups do
          [{[], empty_days} | [{sig, days} | rest]] ->
            # merge empty weekdays into the largest non-empty group
            [{sig, days ++ empty_days} | rest]

          other ->
            other
        end

      groups
      |> Enum.with_index()
      |> Enum.each(fn {{sig, days}, idx} ->
        name = if length(groups) == 1, do: "Everyday", else: "Day #{idx + 1}"

        %{rows: [[day_id]]} =
          repo().query!(
            """
            INSERT INTO nutrition_plan_days (id, name, position, business_id, nutrition_plan_id, inserted_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now()) RETURNING id
            """,
            [name, idx, business_id, plan_id]
          )

        Enum.each(sig, fn {slot, meal_id} ->
          repo().query!(
            """
            INSERT INTO nutrition_day_meals (id, meal_slot, position, business_id, nutrition_plan_day_id, nutrition_meal_id, inserted_at, updated_at)
            VALUES (gen_random_uuid(), $1, 0, $2, $3, $4, now(), now())
            """,
            [slot, business_id, day_id, meal_id]
          )
        end)

        Enum.each(days, fn day ->
          repo().query!(
            """
            INSERT INTO nutrition_weekday_assignments (id, day_of_week, business_id, nutrition_plan_id, nutrition_plan_day_id, inserted_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now())
            """,
            [day, business_id, plan_id, day_id]
          )
        end)
      end)
    end)
  end
end
