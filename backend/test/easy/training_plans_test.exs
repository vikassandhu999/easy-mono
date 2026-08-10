defmodule Easy.TrainingPlansTest do
  use Easy.DataCase, async: true

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Training.TrainingWorkout
  alias Easy.TrainingPlans

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)

      template_a = insert(:training_plan, business: business, creator: trainer_a)
      template_b = insert(:training_plan, business: business, creator: trainer_b)

      %{
        business: business,
        trainer_a: trainer_a,
        trainer_b: trainer_b,
        client_b: client_b,
        template_a: template_a,
        template_b: template_b
      }
    end

    test "list_plans_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} =
               TrainingPlans.list_plans_for_client(trainer_ctx(trainer_a), client_b.id)
    end

    test "assign_plan_to_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b,
      template_a: template_a
    } do
      assert {:error, :not_found} =
               TrainingPlans.assign_plan_to_client(trainer_ctx(trainer_a), client_b.id, template_a.id, %{})
    end

    test "get_plan_full returns :not_found when the plan's client belongs to another trainer", %{
      trainer_a: trainer_a,
      trainer_b: trainer_b,
      client_b: client_b,
      template_b: template_b
    } do
      {:ok, assigned_plan} =
        TrainingPlans.assign_plan_to_client(trainer_ctx(trainer_b), client_b.id, template_b.id, %{})

      assert {:error, :not_found} = TrainingPlans.get_plan_full(trainer_ctx(trainer_a), assigned_plan.id)
    end

    test "owner ctx succeeds on all three", %{
      business: business,
      client_b: client_b,
      template_a: template_a
    } do
      ctx = owner_ctx(business)

      assert {:ok, %{count: _, plans: _}} = TrainingPlans.list_plans_for_client(ctx, client_b.id)

      assert {:ok, assigned_plan} =
               TrainingPlans.assign_plan_to_client(ctx, client_b.id, template_a.id, %{})

      assert {:ok, %{id: id}} = TrainingPlans.get_plan_full(ctx, assigned_plan.id)
      assert id == assigned_plan.id
    end

    test "assigning a plan advances an onboarding client to coaching", %{
      business: business,
      trainer_a: trainer_a,
      template_a: template_a
    } do
      ctx = owner_ctx(business)

      client =
        insert(:client,
          business: business,
          creator: trainer_a,
          assigned_coach: trainer_a,
          stage: :onboarding
        )

      assert {:ok, _assigned} = TrainingPlans.assign_plan_to_client(ctx, client.id, template_a.id, %{})
      assert Repo.get!(Client, client.id).stage == :coaching
    end

    test "assigning a plan leaves a coaching client's stage alone", %{
      business: business,
      trainer_a: trainer_a,
      template_a: template_a
    } do
      ctx = owner_ctx(business)

      client =
        insert(:client,
          business: business,
          creator: trainer_a,
          assigned_coach: trainer_a,
          stage: :coaching
        )

      assert {:ok, _assigned} = TrainingPlans.assign_plan_to_client(ctx, client.id, template_a.id, %{})
      assert Repo.get!(Client, client.id).stage == :coaching
    end

    test "a template plan (client_id nil) is fully visible to every trainer — shared library", %{
      trainer_a: trainer_a,
      template_b: template_b
    } do
      assert {:ok, %{id: id, client_id: nil}} =
               TrainingPlans.get_plan_full(trainer_ctx(trainer_a), template_b.id)

      assert id == template_b.id
    end
  end

  describe "update_plan_schedule/3" do
    setup do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      upper = insert(:workout, plan: plan, business: coach.business)
      lower = insert(:workout, plan: plan, business: coach.business)

      %{
        ctx: Ctx.new(coach.business_id, coach.user_id),
        coach: coach,
        plan: plan,
        upper: upper,
        lower: lower
      }
    end

    test "writes the whole map and empties workouts it no longer names", %{
      ctx: ctx,
      plan: plan,
      upper: upper,
      lower: lower
    } do
      {:ok, _} = TrainingPlans.update_plan_schedule(ctx, plan.id, rest_week(monday: lower.id))

      {:ok, schedule} =
        TrainingPlans.update_plan_schedule(
          ctx,
          plan.id,
          rest_week(monday: upper.id, thursday: upper.id)
        )

      assert schedule["monday"] == upper.id
      assert schedule["thursday"] == upper.id
      assert schedule["sunday"] == nil

      assert Repo.get!(TrainingWorkout, upper.id).weekdays == ["monday", "thursday"]
      assert Repo.get!(TrainingWorkout, lower.id).weekdays == []
    end

    test "rejects a map missing a weekday", %{ctx: ctx, plan: plan, upper: upper} do
      attrs = rest_week(monday: upper.id) |> Map.delete(:sunday)
      assert {:error, :invalid_schedule} = TrainingPlans.update_plan_schedule(ctx, plan.id, attrs)
    end

    test "rejects a workout from another plan", %{ctx: ctx, coach: coach, plan: plan, upper: upper} do
      other_plan = insert(:training_plan, creator: coach, business: coach.business)
      other_workout = insert(:workout, plan: other_plan, business: coach.business)

      assert {:error, :not_found} =
               TrainingPlans.update_plan_schedule(ctx, plan.id, rest_week(monday: other_workout.id))

      assert Repo.get!(TrainingWorkout, upper.id).weekdays == []
    end

    test "returns :not_found for a plan in another business", %{ctx: ctx} do
      foreign_coach = insert(:coach)
      foreign_plan = insert(:training_plan, creator: foreign_coach, business: foreign_coach.business)

      assert {:error, :not_found} = TrainingPlans.update_plan_schedule(ctx, foreign_plan.id, rest_week())
    end
  end

  describe "update_plan/3 period" do
    test "accepts incremental nullable dates and rejects a reversed completed range" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)
      client = insert(:client, business: business, creator: coach, assigned_coach: coach)
      template = insert(:training_plan, business: business, creator: coach)
      ctx = owner_ctx(business)

      assert {:ok, assigned} = TrainingPlans.assign_plan_to_client(ctx, client.id, template.id, %{})
      assert assigned.start_date == nil
      assert assigned.end_date == nil

      assert {:ok, started} = TrainingPlans.update_plan(ctx, assigned.id, %{"start_date" => "2026-08-06"})
      assert started.start_date == ~D[2026-08-06]
      assert started.end_date == nil

      assert {:error, reversed} = TrainingPlans.update_plan(ctx, assigned.id, %{"end_date" => "2026-08-05"})
      assert "must be after or equal to start date" in errors_on(reversed).end_date

      assert {:ok, completed} = TrainingPlans.update_plan(ctx, assigned.id, %{"end_date" => "2026-09-05"})
      assert completed.end_date == ~D[2026-09-05]
      assert {:ok, cleared} = TrainingPlans.update_plan(ctx, assigned.id, %{"start_date" => nil})
      assert cleared.start_date == nil
      assert cleared.end_date == ~D[2026-09-05]
    end
  end

  describe "duplicate_plan/2" do
    test "normalizes and bounds create, update, and duplicate names" do
      coach = insert(:coach)
      ctx = Ctx.new(coach.business_id, coach.user_id)

      assert {:error, whitespace} = TrainingPlans.create_plan(ctx, %{"name" => "   "})
      assert "can't be blank" in errors_on(whitespace).name
      assert {:error, overlong} = TrainingPlans.create_plan(ctx, %{"name" => String.duplicate("x", 256)})
      assert "should be at most 255 character(s)" in errors_on(overlong).name

      assert {:ok, plan} = TrainingPlans.create_plan(ctx, %{"name" => "  Test Training Plan  "})
      assert plan.name == "Test Training Plan"
      assert {:ok, updated} = TrainingPlans.update_plan(ctx, plan.id, %{"name" => "  Test Renamed  "})
      assert updated.name == "Test Renamed"

      assert {:ok, boundary} = TrainingPlans.create_plan(ctx, %{"name" => String.duplicate("x", 255)})
      assert {:ok, copy} = TrainingPlans.duplicate_plan(ctx, boundary.id)
      assert {:ok, second_copy} = TrainingPlans.duplicate_plan(ctx, copy.id)
      assert String.length(copy.name) == 255
      assert String.ends_with?(copy.name, " (Copy)")
      assert String.length(second_copy.name) == 255
      assert String.ends_with?(second_copy.name, " (Copy 2)")
    end

    test "copies each workout's weekdays" do
      coach = insert(:coach)
      plan = insert(:training_plan, creator: coach, business: coach.business)
      now = DateTime.utc_now(:second)

      first =
        insert(:workout,
          plan: plan,
          business: coach.business,
          name: "First",
          weekdays: ["tuesday", "friday"],
          inserted_at: DateTime.add(now, -2, :second)
        )

      insert(:workout,
        plan: plan,
        business: coach.business,
        name: "Second",
        inserted_at: DateTime.add(now, -1, :second)
      )

      insert(:workout, plan: plan, business: coach.business, name: "Third", inserted_at: now)
      ctx = Ctx.new(coach.business_id, coach.user_id)

      assert {:ok, copy} = TrainingPlans.duplicate_plan(ctx, plan.id)
      assert Enum.map(copy.workouts, & &1.name) == ["First", "Second", "Third"]
      assert copy.workouts |> Enum.map(& &1.inserted_at) |> Enum.uniq() |> length() == 3
      refute hd(copy.workouts).id == first.id
      assert hd(copy.workouts).weekdays == ["tuesday", "friday"]
    end
  end

  describe "get_client_active_plan_day/2" do
    test "resolves the day's workout from the workout's weekdays" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      today = Date.utc_today()
      weekday = Easy.Utils.weekday_name(today)

      plan =
        insert(:training_plan,
          creator: coach,
          business: coach.business,
          client: client,
          start_date: nil,
          end_date: nil
        )

      workout = insert(:workout, plan: plan, business: coach.business, weekdays: [weekday])
      _rest = insert(:workout, plan: plan, business: coach.business, weekdays: [])

      ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}

      assert {:ok, %{plan: found_plan, workout: found_workout, day: ^weekday}} =
               TrainingPlans.get_client_active_plan_day(ctx, today)

      assert found_plan.id == plan.id
      assert found_workout.id == workout.id
    end

    test "returns a nil workout on a rest day" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      today = Date.utc_today()

      plan =
        insert(:training_plan,
          creator: coach,
          business: coach.business,
          client: client,
          start_date: Date.add(today, -1),
          end_date: Date.add(today, 7)
        )

      insert(:workout, plan: plan, business: coach.business, weekdays: [])
      ctx = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: client.id}

      assert {:ok, %{workout: nil}} = TrainingPlans.get_client_active_plan_day(ctx, today)
    end
  end

  defp rest_week(overrides \\ []) do
    TrainingWorkout.days()
    |> Map.new(&{&1, nil})
    |> Map.merge(Map.new(overrides))
  end
end
