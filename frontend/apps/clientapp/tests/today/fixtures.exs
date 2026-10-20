unless Mix.env() == :dev, do: raise("Development fixtures only")
Logger.configure(level: :warning)
Code.eval_file("priv/repo/seeds/food_seeds.exs")

defmodule Easy.TodayFixtures do
  import Ecto.Query
  alias Easy.{Ctx, Nutrition, Repo, Workouts}
  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Nutrition.{Food, NutritionLog, NutritionPreset, NutritionSchedule, NutritionTargets, TargetSchedule}
  alias Easy.Workouts.{Exercise, Workout, WorkoutLog, WorkoutSchedule}

  @spec run() :: map()
  def run do
    now = DateTime.utc_now(:second)
    owner = ensure(User, %{email: "today-coach@example.test"}, %{full_name: "Sam", email_confirmed_at: now})
    business = ensure(Business, %{handle: "client-today-browser"}, %{name: "Today browser", timezone: "Etc/UTC", owner_user_id: owner.id})
    ensure(Easy.Billing.BusinessBilling, %{business_id: business.id}, %{free_seats: 3})
    coach = ensure(Coach, %{business_id: business.id, email: owner.email}, %{user_id: owner.id, full_name: "Sam"})
    user = ensure(User, %{email: "today-client@example.test"}, %{full_name: "Alex", email_confirmed_at: now})

    client =
      ensure(Client, %{business_id: business.id, email: user.email}, %{
        user_id: user.id,
        coach_id: coach.id,
        full_name: "Alex",
        preferred_name: "Alex",
        timezone: "Etc/UTC",
        unit_system: :metric
      })

    ensure(Easy.CoachingTerms.CoachingTerm, %{client_id: client.id}, %{starts_on: Date.add(Date.utc_today(), -45)})

    {:ok, _} =
      Repo.transaction(fn ->
        Enum.each([NutritionLog, WorkoutLog, TargetSchedule, NutritionTargets, NutritionSchedule, NutritionPreset, WorkoutSchedule, Workout, Food, Exercise], fn schema ->
          Repo.delete_all(from(row in schema, where: row.business_id == ^business.id))
        end)
      end)

    foods = Easy.Repo.Seeds.Foods.for_business(business)
    ctx = %Ctx{business_id: business.id, user_id: owner.id, coach_id: coach.id, owner?: true}
    meals(ctx, client, foods)
    workout_rows = workouts(ctx, client)

    {:ok, _} =
      Nutrition.create_targets_for_client(ctx, client.id, %{name: "Training day", targets: %{energy_kcal: %{min: 2500, max: 2700}, protein_g: %{min: 160}}, weekdays_mask: 127})

    Map.merge(workout_rows, %{email: user.email, coachEmail: owner.email, clientId: client.id, today: Date.to_iso8601(Date.utc_today())})
  end

  defp meals(ctx, client, foods) do
    breakfast = %{
      type: :meal,
      name: "Breakfast",
      instructions: "Cook the oats in the milk. Stir the whey in after cooking.",
      options: [
        %{name: "Oats bowl", items: items(foods, [{"Rolled oats", 60, "g"}, {"Milk, semi-skimmed", 200, "ml"}, {"Whey protein", 1, "scoop"}, {"Banana", 1, "medium banana"}])},
        %{name: "Eggs on toast", items: items(foods, [{"Egg", 3, "large egg"}, {"Wholegrain toast", 2, "slice"}])}
      ]
    }

    {:ok, %{data: row}} = Nutrition.add_schedule_for_client(ctx, client.id, %{preset: breakfast, weekdays_mask: 127, time: "08:00"})
    past(row)

    for {name, time, food_rows} <- [
          {"Lunch", "13:00", [{"Chicken breast, cooked", 150, "g"}, {"Basmati rice, cooked", 1, "cup"}]},
          {"Dinner", "19:30", [{"Salmon fillet, baked", 1, "fillet"}, {"Potatoes, boiled", 250, "g"}]}
        ] do
      {:ok, %{data: row}} =
        Nutrition.add_schedule_for_client(ctx, client.id, %{
          preset: %{type: :meal, name: name, options: [%{name: nil, items: items(foods, food_rows)}]},
          weekdays_mask: 127,
          time: time
        })

      past(row)
    end

    for {name, amount, unit, time} <- [{"Creatine monohydrate", 5, "g", nil}, {"Vitamin D3 2000 IU", 1, "unit", "08:00"}] do
      {:ok, %{data: row}} =
        Nutrition.add_schedule_for_client(ctx, client.id, %{
          preset: %{type: :supplement, food_id: Map.fetch!(foods, name).id, amount: amount, unit: unit},
          weekdays_mask: 127,
          time: time
        })

      past(row)
    end
  end

  defp items(foods, rows), do: Enum.map(rows, fn {name, amount, unit} -> %{food_id: Map.fetch!(foods, name).id, amount: amount, unit: unit} end)

  defp workouts(ctx, client) do
    exercises =
      Map.new(
        [
          {"Bulgarian split squat", :movement, ~w(reps weight)},
          {"Front squat", :movement, ~w(reps weight)},
          {"Run", :activity, ~w(distance duration)}
        ],
        fn {name, kind, metrics} ->
          {:ok, row} =
            Workouts.create_exercise(ctx, %{
              name: name,
              kind: kind,
              metrics: Enum.map(metrics, &%{key: &1})
            })

          {name, row}
        end
      )

    split =
      exercise(
        exercises,
        "Bulgarian split squat",
        %{
          reps: exact(10),
          weight: exact(16),
          rest: %{mode: "exact", value_s: 60}
        },
        :per_side
      )

    run_entry =
      exercise(exercises, "Run", %{
        distance: exact(5000),
        duration: exact(1800),
        rest: %{mode: "none"}
      })

    groups = [%{rounds: 3, exercises: [split]}, %{rounds: 1, exercises: [run_entry]}]

    {:ok, %{data: lower}} =
      Workouts.create_workout_for_client(ctx, client.id, %{
        name: "Lower A",
        description: "Warm up for 5 minutes first.",
        groups: groups
      })

    lower_schedule = schedule(ctx, client.id, lower.id, %{time: "07:00"})

    {:ok, %{data: run}} =
      Workouts.create_workout_for_client(ctx, client.id, %{
        name: "Easy run",
        description: "Keep it conversational.",
        groups: [%{rounds: 1, exercises: [run_entry]}]
      })

    schedule(ctx, client.id, run.id, %{})
    {:ok, %{data: open}} = Workouts.create_workout_for_client(ctx, client.id, %{name: "Open practice", type: :open, description: "Bring water and trainers."})
    schedule(ctx, client.id, open.id, %{time: "17:00"})
    {:ok, %{data: pt}} = Workouts.create_workout_for_client(ctx, client.id, %{name: "PT session", type: :open, description: "Bring water and trainers."})
    schedule(ctx, client.id, pt.id, %{time: "18:00", coach_id: ctx.coach_id, place: "Iron Works gym"})

    %{
      workoutId: lower.id,
      workoutScheduleId: lower_schedule.id,
      replacementId: Map.fetch!(exercises, "Front squat").id,
      splitExerciseId: Map.fetch!(exercises, "Bulgarian split squat").id,
      runExerciseId: Map.fetch!(exercises, "Run").id,
      runWorkoutId: run.id
    }
  end

  defp exact(value), do: %{mode: "exact", value: value}

  defp exercise(rows, name, targets, side_mode \\ :combined),
    do: %{exercise_id: Map.fetch!(rows, name).id, side_mode: side_mode, targets: [targets]}

  defp schedule(ctx, client_id, id, attrs) do
    {:ok, %{data: row}} = Workouts.add_schedule_for_client(ctx, client_id, Map.merge(%{workout_id: id, weekdays_mask: 127}, attrs))
    past(row)
  end

  defp past(row), do: row |> Ecto.Changeset.change(from_date: Date.add(Date.utc_today(), -30)) |> Repo.update!()
  defp ensure(schema, identity, attrs), do: Repo.get_by(schema, identity) || Repo.insert!(struct(schema, Map.merge(identity, attrs)))
end

fixture = Easy.TodayFixtures.run()
destination = Path.expand("artifacts/fixture.json", __DIR__)
File.mkdir_p!(Path.dirname(destination))
File.write!(destination, Jason.encode!(fixture, pretty: true))
IO.puts("Today fixtures reset by business handle and client email")
