defmodule Easy.Training.ProgrammingTemplateTest do
  use Easy.DataCase, async: true

  alias Easy.Repo
  alias Easy.Training.PlanReader
  alias Easy.Training.Programming
  alias Easy.Training.TrainingPlan

  describe "create_template/2 and list_templates/2" do
    test "creates a canonical template and lists only matching templates from the business" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      assert {:ok, template} =
               Programming.create_template(ctx, %{
                 "name" => "  Strength Foundation  ",
                 "description" => "A reusable four-day block"
               })

      assert template.kind == :template
      assert template.name == "Strength Foundation"
      assert template.description == "A reusable four-day block"
      assert template.revision == 1
      assert template.archived_at == nil
      assert template.client_id == nil
      assert template.source_template_id == nil
      assert template.start_date == nil
      assert template.end_date == nil
      assert template.business_id == coach.business_id
      assert template.creator_id == coach.user_id

      workout =
        insert(:workout,
          business: coach.business,
          plan: template,
          name: "Upper",
          position: 0
        )

      exercise = insert(:exercise, business: coach.business, name: "Bench Press")

      insert(:prescribed_exercise,
        business: coach.business,
        workout: workout,
        exercise: exercise,
        position: 0,
        prescribed_sets: [%{set_type: :working, reps: "8-10"}]
      )

      insert(:workout_schedule,
        business: coach.business,
        plan: template,
        workout: workout,
        weekday: :monday
      )

      insert(:training_plan,
        business: coach.business,
        creator: coach.user,
        kind: :template,
        name: "Mobility Foundation"
      )

      other_coach = insert(:coach)

      insert(:training_plan,
        business: other_coach.business,
        creator: other_coach.user,
        kind: :template,
        name: "Other Strength Foundation"
      )

      assert {:ok, %{count: 1, templates: [listed]}} =
               PlanReader.list_templates(ctx, search: "strength", limit: 20, offset: 0)

      assert listed.id == template.id
      assert listed.kind == :template
      assert [%{id: workout_id, prescribed_exercises: [prescribed]}] = listed.workouts
      assert workout_id == workout.id
      assert prescribed.exercise.name == "Bench Press"
      assert [%{weekday: :monday, training_workout_id: ^workout_id}] = listed.workout_schedule
    end

    test "rejects template-only fields and invalid names" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)

      assert {:error, relationship_fields} =
               Programming.create_template(ctx, %{
                 "name" => "Invalid",
                 "client_id" => Ecto.UUID.generate(),
                 "start_date" => "2026-08-15"
               })

      assert %{client_id: [_], start_date: [_]} = errors_on(relationship_fields)

      assert {:error, malformed_fields} =
               Programming.create_template(ctx, %{
                 "name" => "Still invalid",
                 "client_id" => "not-a-uuid",
                 "start_date" => "not-a-date"
               })

      assert %{client_id: [_], start_date: [_]} = errors_on(malformed_fields)

      assert {:error, blank_name} = Programming.create_template(ctx, %{"name" => "   "})
      assert %{name: ["can't be blank"]} = errors_on(blank_name)
    end
  end

  describe "duplicate_template/2" do
    test "duplicates an active Template as an independent complete Prescription" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user, name: "Strength Base")
      squat = insert(:exercise, business: coach.business, name: "Back Squat")
      press = insert(:exercise, business: coach.business, name: "Press")
      upper = insert(:workout, business: coach.business, plan: template, name: "Upper", position: 20)
      lower = insert(:workout, business: coach.business, plan: template, name: "Lower", position: 10)

      lower_item =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: lower,
          exercise: squat,
          position: 40,
          prescribed_sets: [
            %{set_type: :warmup, reps: "10", rest_seconds: 60},
            %{set_type: :working, reps: "5", load_value: Decimal.new("100"), load_unit: :kg, rpe: Decimal.new("8.5")}
          ]
        )

      upper_item =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: upper,
          exercise: press,
          position: 30,
          prescribed_sets: [%{set_type: :working, reps: "8-10"}]
        )

      insert(:workout_schedule, business: coach.business, plan: template, workout: lower, weekday: :monday)
      insert(:workout_schedule, business: coach.business, plan: template, workout: lower, weekday: :wednesday)
      insert(:workout_schedule, business: coach.business, plan: template, workout: upper, weekday: :friday)

      assert {:ok, duplicate} = Programming.duplicate_template(trainer_ctx(coach), template.id)

      assert duplicate.id != template.id
      assert duplicate.kind == :template
      assert duplicate.name == "Strength Base (Copy)"
      assert duplicate.description == template.description
      assert duplicate.revision == 1
      assert duplicate.archived_at == nil
      assert duplicate.client_id == nil
      assert duplicate.source_template_id == nil
      assert duplicate.business_id == coach.business_id
      assert duplicate.creator_id == coach.user_id

      assert [copied_lower, copied_upper] = duplicate.workouts
      assert Enum.map(duplicate.workouts, &{&1.name, &1.position}) == [{"Lower", 10}, {"Upper", 20}]
      assert copied_lower.id != lower.id
      assert copied_upper.id != upper.id

      assert [%{id: copied_lower_item_id, exercise_id: squat_id, position: 40, prescribed_sets: copied_sets}] =
               copied_lower.prescribed_exercises

      assert copied_lower_item_id != lower_item.id
      assert squat_id == squat.id
      assert [warmup, working] = copied_sets
      assert warmup.set_type == :warmup
      assert warmup.reps == "10"
      assert warmup.rest_seconds == 60
      assert working.set_type == :working
      assert working.reps == "5"
      assert Decimal.equal?(working.load_value, Decimal.new("100"))
      assert working.load_unit == :kg
      assert Decimal.equal?(working.rpe, Decimal.new("8.5"))

      assert [%{id: copied_upper_item_id, exercise_id: press_id, position: 30, prescribed_sets: [%{reps: "8-10"}]}] =
               copied_upper.prescribed_exercises

      assert copied_upper_item_id != upper_item.id
      assert press_id == press.id

      assert Enum.map(duplicate.workout_schedule, &{&1.weekday, &1.training_workout_id}) == [
               {:monday, copied_lower.id},
               {:wednesday, copied_lower.id},
               {:friday, copied_upper.id}
             ]
    end

    test "generates distinguishable names within the Template name limit" do
      coach = insert(:coach)
      base = String.duplicate("A", 255)
      template = insert(:training_plan, business: coach.business, creator: coach.user, name: base)
      same_named_template = insert(:training_plan, business: coach.business, creator: coach.user, name: base)

      assert {:ok, first_copy} = Programming.duplicate_template(trainer_ctx(coach), template.id)
      assert String.length(first_copy.name) == 255
      assert first_copy.name != template.name
      assert String.ends_with?(first_copy.name, " (Copy)")

      assert {:ok, second_copy} = Programming.duplicate_template(trainer_ctx(coach), same_named_template.id)
      assert String.length(second_copy.name) == 255
      assert second_copy.name not in [template.name, first_copy.name]
      assert String.ends_with?(second_copy.name, " (Copy 2)")
    end

    test "returns not found for archived, Client Plan, and cross-tenant sources" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other_coach = insert(:coach)

      archived =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          archived_at: ~U[2026-08-15 12:00:00Z]
        )

      client_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      hidden = insert(:training_plan, business: other_coach.business, creator: other_coach.user)

      for source <- [archived, client_plan, hidden] do
        assert {:error, :not_found} = Programming.duplicate_template(trainer_ctx(coach), source.id)
      end

      assert Repo.aggregate(TrainingPlan.for_business(TrainingPlan, coach.business_id), :count, :id) == 2
    end
  end
end
