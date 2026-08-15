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

alias Easy.Nutrition.{Plan, MealLog, FoodLogEntry, Food}
alias Easy.Fitness.WeightEntry
alias Easy.Forms.{FormTemplate, FormAssignment, FormSubmission, CheckInSchedule}

client_id = "f9e0ba52-2974-45b9-bf29-ffc3e081f7bd"
client = Repo.get!(Client, client_id)
bid = client.business_id
coach_id = client.assigned_coach_id || client.creator_id
coach = Repo.get_by(Easy.Orgs.Coach, id: coach_id)
coach_user_id = (coach && coach.user_id) || raise("client requires an assigned coach user")
today = Date.utc_today()

d = fn x -> Decimal.new(to_string(x)) end

dt = fn %Date{} = date, {h, m} ->
  DateTime.new!(date, Time.new!(h, m, 0), "Etc/UTC") |> DateTime.truncate(:second)
end

day_atom = %{1 => :monday, 2 => :tuesday, 3 => :wednesday, 4 => :thursday, 5 => :friday, 6 => :saturday, 7 => :sunday}

IO.puts("== seed for #{client.first_name} #{client.last_name} (biz #{bid}) ==")

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
              "exercise_id" => element.ex_id,
              "exercise_name" => element.ex_name,
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
          client_id: client_id,
          training_workout_id: w.id
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
# 3 + 4. Nutrition plan + meal logs
# ------------------------------------------------------------------
nutri_name = "Cutting Phase"

seeded_entries? =
  Repo.aggregate(
    from(e in FoodLogEntry, join: m in MealLog, on: e.nutrition_meal_log_id == m.id, where: m.client_id == ^client_id),
    :count
  ) > 0

if seeded_entries? do
  IO.puts("nutrition: meal logs already seeded — skipping")
else
  # drop any partial rows left by an earlier failed run, then recreate cleanly
  Repo.delete_all(from m in MealLog, where: m.client_id == ^client_id)
  Repo.delete_all(from p in Plan, where: p.client_id == ^client_id and p.name == ^nutri_name)

  _plan =
    Repo.insert!(%Plan{
      name: nutri_name,
      description: "Moderate deficit, high protein. 4 meals per day.",
      status: :active,
      target_calories: 1900.0,
      target_protein_g: 165.0,
      target_carbs_g: 175.0,
      target_fat_g: 60.0,
      target_fiber_g: 30.0,
      start_date: Date.add(today, -28),
      end_date: nil,
      business_id: bid,
      creator_id: coach_id,
      client_id: client_id
    })

  food_pool =
    Repo.all(
      from f in Food,
        where: (f.source == :system or f.business_id == ^bid) and f.calories_per_100g > 30.0 and f.calories_per_100g < 600.0,
        order_by: [asc: f.name],
        limit: 25,
        select: %{id: f.id, name: f.name, kcal: f.calories_per_100g, p: f.protein_g_per_100g, c: f.carbs_g_per_100g, fat: f.fat_g_per_100g, fiber: f.fiber_g_per_100g}
    )

  if food_pool == [], do: raise("no foods in library to build meal logs")

  fp = fn i -> Enum.at(food_pool, rem(i, length(food_pool))) end
  r1 = fn x -> Float.round(x * 1.0, 1) end

  # build an entry from a food and its frozen planned-item identity
  entry = fn meal_log_id, food, grams, source, planned_item_id ->
    factor = grams / 100.0

    %FoodLogEntry{
      food_name: food.name,
      amount: grams * 1.0,
      unit: "g",
      weight_g: grams * 1.0,
      calories: r1.((food.kcal || 0.0) * factor),
      protein_g: r1.((food.p || 0.0) * factor),
      carbs_g: r1.((food.c || 0.0) * factor),
      fat_g: r1.((food.fat || 0.0) * factor),
      fiber_g: r1.((food.fiber || 0.0) * factor),
      planned_item_id: if(source == :unplanned, do: nil, else: planned_item_id),
      nutrition_meal_log_id: meal_log_id,
      food_id: food.id
    }
  end

  # snapshot item map matching the shape build_planned_snapshot/2 produces
  snap_item = fn food, grams ->
    factor = grams / 100.0

    %{
      "id" => Ecto.UUID.generate(),
      "food_name" => food.name,
      "amount" => grams,
      "unit" => "g",
      "weight_g" => grams * 1.0,
      "calories" => r1.((food.kcal || 0.0) * factor),
      "protein_g" => r1.((food.p || 0.0) * factor),
      "carbs_g" => r1.((food.c || 0.0) * factor),
      "fat_g" => r1.((food.fat || 0.0) * factor),
      "fiber_g" => r1.((food.fiber || 0.0) * factor)
    }
  end

  # meal blueprint: slot => {planned_calories, [{food_index, grams}, ...]}
  meal_blueprint = [
    {:breakfast, 450, [{0, 80}, {1, 200}]},
    {:lunch, 600, [{2, 150}, {3, 120}]},
    {:dinner, 650, [{4, 180}, {5, 150}]},
    {:afternoon_snack, 200, [{6, 100}]}
  ]

  # 14-day window; skip 3 days entirely (no logs); vary adherence
  # adherence map by day offset
  skip_days = MapSet.new([3, 8, 11])

  {logged_days, total_logs, total_entries} =
    Enum.reduce(1..14, {0, 0, 0}, fn offset, {days, logs, entries_acc} ->
      if MapSet.member?(skip_days, offset) do
        {days, logs, entries_acc}
      else
        date = Date.add(today, -offset)

        adherence =
          cond do
            offset == 5 -> 0.70
            offset == 9 -> 1.20
            true -> 0.90 + :rand.uniform() * 0.1
          end

        # on one day (offset 6) drop the last slot's last planned item -> "Skipped" row
        skip_planned_day? = offset == 6

        {day_logs, day_entries} =
          Enum.reduce(meal_blueprint, {0, 0}, fn {slot, planned_cals, items}, {lc, ec} ->
            {ml_logs, entry_structs, snap_items} =
              items
              |> Enum.with_index()
              |> Enum.reduce({[], [], []}, fn {{fidx, grams}, pos}, {mls, es, ss} ->
                food = fp.(fidx + offset)
                logged_grams = round(grams * adherence)
                snap = snap_item.(food, grams)

                # decide source: mostly planned, occasional replacement/unplanned
                {source, this_food} =
                  cond do
                    rem(offset + pos, 7) == 0 -> {:replacement, fp.(fidx + offset + 1)}
                    rem(offset + pos, 11) == 0 -> {:unplanned, food}
                    true -> {:planned, food}
                  end

                {mls, [{this_food, logged_grams, source, snap["id"]} | es], [snap | ss]}
              end)

            snap_items_ordered = Enum.reverse(snap_items)
            entry_specs = Enum.reverse(entry_structs)

            # planned_snapshot for this meal log
            snapshot = %{
              "meal_name" => Atom.to_string(slot) |> String.replace("_", " ") |> String.capitalize(),
              "items" => snap_items_ordered,
              "total_calories" => Enum.reduce(snap_items_ordered, 0.0, &(&1["calories"] + &2)),
              "total_protein_g" => Enum.reduce(snap_items_ordered, 0.0, &(&1["protein_g"] + &2)),
              "total_carbs_g" => Enum.reduce(snap_items_ordered, 0.0, &(&1["carbs_g"] + &2)),
              "total_fat_g" => Enum.reduce(snap_items_ordered, 0.0, &(&1["fat_g"] + &2)),
              "total_fiber_g" => Enum.reduce(snap_items_ordered, 0.0, &(&1["fiber_g"] + &2))
            }

            # on the skip-planned day, drop the last planned item of the last slot
            drop_last? = skip_planned_day? and slot == :afternoon_snack

            entry_specs =
              if drop_last?, do: Enum.drop(entry_specs, -1), else: entry_specs

            meal_log =
              Repo.insert!(%MealLog{
                date: date,
                meal_slot: slot,
                planned_snapshot: snapshot,
                planned_calories: planned_cals * 1.0,
                logged_calories: 0.0,
                business_id: bid,
                client_id: client_id
              })

            inserted =
              Enum.reduce(entry_specs, 0.0, fn {food, grams, source, planned_item_id}, kcal_acc ->
                e = entry.(meal_log.id, food, grams, source, planned_item_id)
                Repo.insert!(e)
                kcal_acc + e.calories
              end)

            Repo.update!(Ecto.Changeset.change(meal_log, logged_calories: r1.(inserted)))

            _ = ml_logs
            {lc + 1, ec + length(entry_specs)}
          end)

        {days + 1, logs + day_logs, entries_acc + day_entries}
      end
    end)

  IO.puts("nutrition: plan + #{total_logs} meal logs across #{logged_days} days, #{total_entries} food-log entries (3 days skipped, 1 planned-item skipped)")
end

# ------------------------------------------------------------------
# 5. Weight entries + goal weight
# ------------------------------------------------------------------
existing_weights = Repo.aggregate(from(w in WeightEntry, where: w.client_id == ^client_id), :count)

if existing_weights > 0 do
  IO.puts("weight: #{existing_weights} entries already exist — skipping")
else
  # 12 entries over ~100 days, trending 78.0 -> 74.2 kg
  points = 12
  start_w = 78.0
  end_w = 74.2
  step = (start_w - end_w) / (points - 1)

  notes_at = %{0 => "Starting weigh-in", 6 => "Feeling leaner, clothes fitting better", 11 => "Great progress this block"}

  for i <- 0..(points - 1) do
    days_ago = 100 - round(i * (100 / (points - 1)))
    # small noise so the line isn't perfectly straight
    noise = (:rand.uniform() - 0.5) * 0.4
    value = Float.round(start_w - i * step + noise, 1)

    Repo.insert!(%WeightEntry{
      date: Date.add(today, -days_ago),
      value: d.(value),
      unit: :kg,
      note: Map.get(notes_at, i),
      business_id: bid,
      client_id: client_id
    })
  end

  Repo.update!(Ecto.Changeset.change(client, goal_weight_value: d.(70), goal_weight_unit: :kg))
  IO.puts("weight: #{points} entries (78.0 -> 74.2 kg), goal set to 70 kg")
end

# ------------------------------------------------------------------
# 6. Check-in schedule + form assignments + submissions (+ intake)
# ------------------------------------------------------------------
if Repo.get_by(CheckInSchedule, client_id: client_id) do
  IO.puts("forms: check-in schedule already exists — skipping")
else
  check_in_tmpl =
    Repo.one(from t in FormTemplate, where: t.business_id == ^bid and t.purpose == :check_in, limit: 1) ||
      raise("no check-in form template for this business")

  intake_tmpl = Repo.one(from t in FormTemplate, where: t.business_id == ^bid and t.purpose == :intake, limit: 1)

  # generate a plausible answer per question type; skip photo (no object storage)
  answer_for = fn q ->
    case q["type"] do
      "text" -> {q["id"], "Solid week overall. Energy was high and I hit all my training sessions."}
      "number" -> {q["id"], 7}
      "boolean" -> {q["id"], true}
      "date" -> {q["id"], Date.to_iso8601(today)}
      "select" -> {q["id"], List.first(q["options"] || [])}
      "multi_select" -> {q["id"], [List.first(q["options"] || [])] |> Enum.reject(&is_nil/1)}
      "rating" -> {q["id"], Enum.random(3..5)}
      "weight" -> {q["id"], 75.4}
      _ -> nil
    end
  end

  build_answers = fn sections ->
    for section <- List.wrap(sections),
        q <- List.wrap(section["questions"]),
        pair = answer_for.(q),
        not is_nil(pair),
        into: %{},
        do: pair
  end

  insert_submission = fn business_id, template, assignment_id, submitted_at, reviewed_at ->
    Repo.insert!(%FormSubmission{
      question_snapshot: template.sections,
      answers: build_answers.(template.sections),
      submitted_by_type: :client,
      submitted_by_id: client_id,
      submitted_at: submitted_at,
      reviewed_at: reviewed_at,
      reviewed_by_id: if(reviewed_at, do: coach_user_id, else: nil),
      business_id: business_id,
      client_id: client_id,
      form_assignment_id: assignment_id
    })
  end

  # active weekly schedule, due tomorrow
  schedule =
    Repo.insert!(%CheckInSchedule{
      frequency: :weekly,
      next_due_on: Date.add(today, 1),
      active: true,
      business_id: bid,
      client_id: client_id,
      form_template_id: check_in_tmpl.id
    })

  # completed check-in #1 (older, reviewed)
  a1 =
    Repo.insert!(%FormAssignment{
      purpose: :check_in,
      priority: :normal,
      status: :completed,
      due_date: Date.add(today, -14),
      completed_at: dt.(Date.add(today, -13), {9, 30}),
      business_id: bid,
      client_id: client_id,
      form_template_id: check_in_tmpl.id,
      check_in_schedule_id: schedule.id
    })

  insert_submission.(bid, check_in_tmpl, a1.id, dt.(Date.add(today, -13), {9, 30}), dt.(Date.add(today, -12), {14, 0}))

  # completed check-in #2 (newest, unreviewed)
  a2 =
    Repo.insert!(%FormAssignment{
      purpose: :check_in,
      priority: :normal,
      status: :completed,
      due_date: Date.add(today, -7),
      completed_at: dt.(Date.add(today, -6), {8, 15}),
      business_id: bid,
      client_id: client_id,
      form_template_id: check_in_tmpl.id,
      check_in_schedule_id: schedule.id
    })

  insert_submission.(bid, check_in_tmpl, a2.id, dt.(Date.add(today, -6), {8, 15}), nil)

  # missed check-in (past due, no submission)
  Repo.insert!(%FormAssignment{
    purpose: :check_in,
    priority: :normal,
    status: :missed,
    due_date: Date.add(today, -2),
    business_id: bid,
    client_id: client_id,
    form_template_id: check_in_tmpl.id,
    check_in_schedule_id: schedule.id
  })

  intake_note =
    if intake_tmpl do
      ai =
        Repo.insert!(%FormAssignment{
          purpose: :intake,
          priority: :normal,
          status: :completed,
          due_date: Date.add(today, -25),
          completed_at: dt.(Date.add(today, -24), {10, 0}),
          business_id: bid,
          client_id: client_id,
          form_template_id: intake_tmpl.id
        })

      insert_submission.(bid, intake_tmpl, ai.id, dt.(Date.add(today, -24), {10, 0}), dt.(Date.add(today, -23), {11, 0}))
      "1 completed intake"
    else
      "no intake template found"
    end

  IO.puts("forms: check-in schedule (weekly, due tomorrow) + 2 completed check-ins (1 reviewed, 1 unreviewed) + 1 missed; #{intake_note}")
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
IO.puts("meal logs:             #{count.(from m in MealLog, where: m.client_id == ^client_id)}")
IO.puts("food log entries:      #{count.(from(e in FoodLogEntry, join: m in MealLog, on: e.nutrition_meal_log_id == m.id, where: m.client_id == ^client_id))}")
IO.puts("weight entries:        #{count.(from w in WeightEntry, where: w.client_id == ^client_id)}")
IO.puts("check-in schedules:    #{count.(from s in CheckInSchedule, where: s.client_id == ^client_id)}")
IO.puts("form assignments:      #{count.(from a in FormAssignment, where: a.client_id == ^client_id)}")
IO.puts("form submissions:      #{count.(from s in FormSubmission, where: s.client_id == ^client_id)}")
IO.puts("goal weight:           #{inspect(Repo.reload!(client).goal_weight_value)} #{Repo.reload!(client).goal_weight_unit}")
IO.puts("\ndone.")
