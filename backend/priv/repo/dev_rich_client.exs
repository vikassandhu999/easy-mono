# Dev-only, idempotent-ish seed: make client "Rowan White" data-rich so the
# coach app client-detail screen has content to render.
#
#   cd backend && mix run priv/repo/dev_rich_client.exs
#
# Guards each section on a marker row so re-runs don't duplicate.

import Ecto.Query
alias Easy.Repo

alias Easy.Clients.Client

alias Easy.Training.{
  PlannedSet,
  PrescribedExercise,
  TrainingExercise,
  TrainingPerformedSet,
  TrainingPlan,
  TrainingSession,
  TrainingWorkout,
  WorkoutSchedule
}

alias Easy.Nutrition.{Diary, DiaryEntry, DiarySlot, Food, Plan, Programming}

client_id = "f9e0ba52-2974-45b9-bf29-ffc3e081f7bd"
client = Repo.get!(Client, client_id)
bid = client.business_id
coach_id = client.coach_id
coach = Repo.get_by(Easy.Orgs.Coach, id: coach_id)
coach_user_id = (coach && coach.user_id) || raise("client requires an assigned coach user")
today = Date.utc_today()

d = fn x -> Decimal.new(to_string(x)) end

dt = fn %Date{} = date, {h, m} ->
  DateTime.new!(date, Time.new!(h, m, 0), "Etc/UTC") |> DateTime.truncate(:second)
end

day_atom = %{1 => :monday, 2 => :tuesday, 3 => :wednesday, 4 => :thursday, 5 => :friday, 6 => :saturday, 7 => :sunday}

IO.puts("== seed for #{client.full_name} (biz #{bid}) ==")

# ------------------------------------------------------------------
# 1 + 2. Training plan, workouts, schedule, sessions
# ------------------------------------------------------------------
plan_name = "Push Pull Legs"

if Repo.get_by(TrainingPlan, client_id: client_id, name: plan_name) do
  IO.puts("training: plan '#{plan_name}' already exists — skipping")
else
  ex_pool =
    Repo.all(
      from e in TrainingExercise,
        where: (e.source == :system or e.business_id == ^bid) and e.tracking_type == :weight_reps,
        order_by: [asc: e.name],
        limit: 9,
        select: %{id: e.id, name: e.name}
    )

  ex_pool =
    if length(ex_pool) >= 9 do
      ex_pool
    else
      Repo.all(
        from e in TrainingExercise,
          where: e.source == :system or e.business_id == ^bid,
          order_by: [asc: e.name],
          limit: 9,
          select: %{id: e.id, name: e.name}
      )
    end

  if length(ex_pool) < 3, do: raise("not enough exercises in library to build workouts")

  plan =
    Repo.insert!(%TrainingPlan{
      kind: :client_plan,
      name: plan_name,
      description: "6-week push/pull/legs block. Progressive overload, ~4 sessions per week.",
      revision: 1,
      start_date: Date.add(today, -42),
      end_date: nil,
      business_id: bid,
      creator_id: coach_user_id,
      client_id: client_id
    })

  planned_sets = fn n, reps, load ->
    for _ <- 1..n do
      %PlannedSet{set_type: :working, reps: reps, load_value: d.(load), load_unit: :kg, rest_seconds: 120}
    end
  end

  make_workout = fn name, position, exercises ->
    w =
      Repo.insert!(%TrainingWorkout{
        name: name,
        position: position,
        business_id: bid,
        training_plan_id: plan.id
      })

    elements =
      exercises
      |> Enum.with_index()
      |> Enum.map(fn {ex, pos} ->
        sets = planned_sets.(3, "8", 60)

        prescribed =
          Repo.insert!(%PrescribedExercise{
            position: pos,
            business_id: bid,
            training_workout_id: w.id,
            exercise_id: ex.id,
            prescribed_sets: sets,
            exercise: nil
          })

        %{
          prescription_id: prescribed.id,
          ex_name: ex.name,
          ex_id: ex.id,
          position: pos,
          tracking_type: ex.tracking_type,
          sets: sets
        }
      end)

    {w, elements}
  end

  {push_w, push_els} = make_workout.("Push", 0, Enum.slice(ex_pool, 0, 3))
  {pull_w, pull_els} = make_workout.("Pull", 1, Enum.slice(ex_pool, 3, 3))
  {legs_w, legs_els} = make_workout.("Legs", 2, Enum.slice(ex_pool, 6, 3))

  workout_for = %{monday: {push_w, push_els}, tuesday: {pull_w, pull_els}, thursday: {legs_w, legs_els}, saturday: {push_w, push_els}}

  for {weekday, {workout, _elements}} <- workout_for do
    Repo.insert!(%WorkoutSchedule{
      weekday: weekday,
      business_id: bid,
      training_plan_id: plan.id,
      training_workout_id: workout.id
    })
  end

  snapshot_for = fn workout, elements ->
    %{
      "version" => 1,
      "plan" => %{"id" => plan.id, "name" => plan.name, "revision" => plan.revision},
      "workout" => %{
        "id" => workout.id,
        "name" => workout.name,
        "exercises" =>
          Enum.map(elements, fn element ->
            %{
              "ref" => element.prescription_id,
              "position" => element.position,
              "exercise_id" => element.ex_id,
              "exercise_name" => element.ex_name,
              "tracking_type" => element.tracking_type,
              "sets" => Enum.map(element.sets, &PlannedSet.to_snapshot/1)
            }
          end)
      }
    }
  end

  scheduled_days = MapSet.new([:monday, :tuesday, :thursday, :saturday])

  # scheduled calendar dates in the last 21 days, most-recent first
  scheduled_dates =
    for offset <- 1..21,
        date = Date.add(today, -offset),
        day = Map.fetch!(day_atom, Date.day_of_week(date)),
        MapSet.member?(scheduled_days, day),
        do: {date, day}

  # skip the 2 most recent scheduled days -> "missed" ghost rows; complete the rest
  [_skip1, _skip2 | to_complete] = scheduled_dates
  to_complete = Enum.take(to_complete, 8)

  perform_sets = fn session_id, els, week_idx ->
    base_bump = week_idx * 2

    els
    |> Enum.with_index()
    |> Enum.reduce(0, fn {el, ex_idx}, pos ->
      # first exercise of the day gets a warmup set
      warmups = if ex_idx == 0, do: [{:warmup, "12", 40}], else: []
      workings = [{:working, "8", 60 + base_bump}, {:working, "8", 60 + base_bump}, {:working, "7", 62 + base_bump}]
      sets = warmups ++ workings

      sets
      |> Enum.with_index()
      |> Enum.reduce(pos, fn {{stype, reps, load}, i}, p ->
        last_working? = stype == :working and i == length(sets) - 1

        Repo.insert!(%TrainingPerformedSet{
          exercise_name: el.ex_name,
          snapshot_exercise_ref: el.prescription_id,
          set_type: stype,
          position: p,
          reps: reps,
          load_value: d.(load),
          load_unit: :kg,
          rpe: if(last_working?, do: d.("8.5"), else: nil),
          notes: if(last_working? and ex_idx == 0, do: "Felt strong, could add weight next week", else: nil),
          business_id: bid,
          training_session_id: session_id,
          exercise_id: el.ex_id
        })

        p + 1
      end)
    end)
  end

  completed_count =
    to_complete
    |> Enum.with_index()
    |> Enum.map(fn {{date, day}, idx} ->
      {w, els} = Map.fetch!(workout_for, day)
      # oldest sessions = earlier weeks -> lower loads
      week_idx = 8 - idx
      add_feedback? = rem(idx, 3) == 0

      session =
        Repo.insert!(%TrainingSession{
          kind: :planned,
          date: date,
          started_at: dt.(date, {18, 0}),
          closed_at: dt.(date, {19, 5}),
          state: :completed,
          snapshot_version: 1,
          prescription_snapshot: snapshot_for.(w, els),
          source_plan_id: plan.id,
          source_workout_id: w.id,
          soreness_rating: if(add_feedback?, do: Enum.random(2..4), else: nil),
          notes: if(add_feedback?, do: "Good session. Legs a bit sore from last time but pushed through.", else: nil),
          business_id: bid,
          client_id: client_id
        })

      perform_sets.(session.id, els, week_idx)
      session
    end)
    |> length()

  # one active session today
  {w_today, els_today} = Map.fetch!(workout_for, :monday)

  active =
    Repo.insert!(%TrainingSession{
      kind: :planned,
      date: today,
      started_at: dt.(today, {17, 30}),
      closed_at: nil,
      state: :active,
      snapshot_version: 1,
      prescription_snapshot: snapshot_for.(w_today, els_today),
      source_plan_id: plan.id,
      source_workout_id: w_today.id,
      business_id: bid,
      client_id: client_id
    })

  # a few sets already logged in the in-progress session
  els_today
  |> Enum.slice(0, 2)
  |> Enum.with_index()
  |> Enum.reduce(0, fn {el, _ex_idx}, pos ->
    Enum.reduce(0..2, pos, fn _i, p ->
      Repo.insert!(%TrainingPerformedSet{
        exercise_name: el.ex_name,
        snapshot_exercise_ref: el.prescription_id,
        set_type: :working,
        position: p,
        reps: "8",
        load_value: d.(62),
        load_unit: :kg,
        business_id: bid,
        training_session_id: active.id,
        exercise_id: el.ex_id
      })

      p + 1
    end)
  end)

  IO.puts("training: plan + 3 workouts + #{map_size(workout_for)} schedule entries, #{completed_count} completed sessions, 1 active, 2 missed gaps")
end

# ------------------------------------------------------------------
# 3 + 4. Nutrition Template, Client Plan, and Diary extras
# ------------------------------------------------------------------
nutri_name = "Cutting Phase"
nutri_description = "Moderate deficit, high protein."

seeded_entries? =
  Repo.aggregate(from(e in DiaryEntry, where: e.client_id == ^client_id), :count) > 0

if seeded_entries? do
  IO.puts("nutrition: diary already seeded — skipping")
else
  Repo.delete_all(from e in DiaryEntry, where: e.client_id == ^client_id)
  Repo.delete_all(from s in DiarySlot, where: s.client_id == ^client_id)

  seeded_template_ids =
    Repo.all(
      from p in Plan,
        where:
          p.business_id == ^bid and p.kind == :client_plan and p.client_id == ^client_id and
            p.name == ^nutri_name and p.description == ^nutri_description,
        select: p.source_template_id
    )

  Repo.delete_all(
    from p in Plan,
      where:
        p.business_id == ^bid and p.kind == :client_plan and p.client_id == ^client_id and
          p.name == ^nutri_name and p.description == ^nutri_description
  )

  Repo.delete_all(
    from p in Plan,
      where:
        p.business_id == ^bid and p.kind == :template and p.id in ^seeded_template_ids and
          p.name == ^nutri_name and p.description == ^nutri_description
  )

  ctx = %Easy.Ctx{business_id: bid, user_id: coach_user_id, coach_id: coach_id, owner?: true}
  client_ctx = %Easy.Ctx{business_id: bid, user_id: client.user_id, client_id: client_id}

  food_pool =
    Repo.all(
      from f in Food,
        where: (f.source == :system or f.business_id == ^bid) and f.calories_per_100g > 30.0 and f.calories_per_100g < 600.0,
        order_by: [asc: f.name],
        limit: 8
    )

  if food_pool == [], do: raise("no foods in library to build Diary extras")

  {:ok, template} =
    Programming.create_template(ctx, %{
      "name" => nutri_name,
      "description" => nutri_description,
      "target_calories" => 1900.0,
      "target_protein_g" => 165.0,
      "target_carbs_g" => 175.0,
      "target_fat_g" => 60.0,
      "target_fiber_g" => 30.0
    })

  pattern = hd(template.menu.day_patterns)
  gram = fn grams -> %{kind: :gram, grams: grams * 1.0} end

  meal_ids = Map.new(~w(breakfast lunch dinner), &{&1, Ecto.UUID.generate()})

  item = fn food, grams ->
    %{id: Ecto.UUID.generate(), kind: :food, food_id: food.id, portion: gram.(grams)}
  end

  [b0, b1, l0, l1, d0, d1 | _] = food_pool ++ food_pool

  {:ok, source} =
    Programming.replace_menu(ctx, template.id, 1, %{
      meals: [
        %{id: meal_ids["breakfast"], name: "Breakfast", meal_items: [item.(b0, 80), item.(b1, 200)]},
        %{id: meal_ids["lunch"], name: "Lunch", meal_items: [item.(l0, 150), item.(l1, 120)]},
        %{id: meal_ids["dinner"], name: "Dinner", meal_items: [item.(d0, 180), item.(d1, 150)]}
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          slots: [
            %{meal_slot: :breakfast, meal_ids: [meal_ids["breakfast"]]},
            %{meal_slot: :lunch, meal_ids: [meal_ids["lunch"]]},
            %{meal_slot: :dinner, meal_ids: [meal_ids["dinner"]]}
          ]
        }
      ],
      schedule: Map.new(Easy.Nutrition.Menu.weekdays(), &{&1, pattern.id})
    })

  {:ok, plan} =
    Programming.assign_template_to_client(ctx, client_id, source.id, 2, %{
      "start_date" => Date.to_iso8601(Date.add(today, -5)),
      "end_date" => nil
    })

  skip_days = MapSet.new([3])
  extra_food = hd(food_pool)
  item = hd(hd(plan.menu.meals).meal_items)

  {:ok, day} = Diary.get_client_nutrition_day(client_ctx, today)
  breakfast = Enum.find(day.slots, &(&1.meal_slot == :breakfast))

  {:ok, _} =
    Diary.save_client_nutrition_day(client_ctx, today, %{
      slots: [
        %{
          meal_slot: :breakfast,
          meal_id: breakfast.meal_id,
          expected_revision: breakfast.revision,
          entries: [
            %{
              id: Ecto.UUID.generate(),
              planned_item_ref: item.id,
              food_id: item.food_id,
              recipe_id: item.recipe_id,
              notes: nil,
              portion: %{kind: item.portion_kind, grams: item.weight_g, amount: item.amount, unit: item.unit, label: item.serving_label}
            }
          ]
        }
      ]
    })

  extras =
    Enum.reduce(1..4, 0, fn offset, count ->
      if MapSet.member?(skip_days, offset) do
        count
      else
        date = Date.add(today, -offset)

        {:ok, _} =
          Diary.save_client_nutrition_day(client_ctx, date, %{
            slots: [
              %{
                meal_slot: :lunch,
                meal_id: nil,
                expected_revision: 0,
                entries: [%{id: Ecto.UUID.generate(), planned_item_ref: nil, food_id: extra_food.id, recipe_id: nil, notes: nil, portion: gram.(80)}]
              }
            ]
          })

        count + 1
      end
    end)

  {:ok, _} =
    Diary.save_client_nutrition_day(client_ctx, Date.add(today, -7), %{
      slots: [
        %{
          meal_slot: :dinner,
          meal_id: nil,
          expected_revision: 0,
          entries: [%{id: Ecto.UUID.generate(), planned_item_ref: nil, food_id: extra_food.id, recipe_id: nil, notes: nil, portion: gram.(40)}]
        }
      ]
    })

  IO.puts("nutrition: assigned Client Plan + planned fulfilment + #{extras} extras + 1 no-Coverage entry")
end

# ------------------------------------------------------------------
# Verify: counts
# ------------------------------------------------------------------
IO.puts("\n== summary counts for client #{client_id} ==")
count = fn q -> Repo.aggregate(q, :count) end

IO.puts("training plans:        #{count.(from p in TrainingPlan, where: p.client_id == ^client_id)}")
IO.puts("training sessions:     #{count.(from s in TrainingSession, where: s.client_id == ^client_id)}")
IO.puts("  completed:           #{count.(from s in TrainingSession, where: s.client_id == ^client_id and s.state == :completed)}")
IO.puts("  active:              #{count.(from s in TrainingSession, where: s.client_id == ^client_id and s.state == :active)}")
IO.puts("performed sets:        #{count.(from ps in TrainingPerformedSet, join: s in TrainingSession, on: ps.training_session_id == s.id, where: s.client_id == ^client_id)}")
IO.puts("nutrition plans:       #{count.(from p in Plan, where: p.client_id == ^client_id)}")
IO.puts("diary slots:           #{count.(from s in DiarySlot, where: s.client_id == ^client_id)}")
IO.puts("diary entries:         #{count.(from e in DiaryEntry, where: e.client_id == ^client_id)}")
IO.puts("\ndone.")
