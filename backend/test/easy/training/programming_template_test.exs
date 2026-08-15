defmodule Easy.Training.ProgrammingTemplateTest do
  use Easy.DataCase, async: true

  alias Easy.Training.Programming

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
               Programming.list_templates(ctx, search: "strength", limit: 20, offset: 0)

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
end
