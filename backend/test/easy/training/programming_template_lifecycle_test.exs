defmodule Easy.Training.ProgrammingTemplateLifecycleTest do
  use Easy.DataCase, async: true

  alias Easy.Repo
  alias Easy.Training.PlanReader
  alias Easy.Training.{Programming, TrainingPlan}

  describe "Training Template lifecycle" do
    test "repeated lifecycle actions preserve templates and client plans at the current revision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, coach: coach)

      for kind <- [:template, :client_plan] do
        plan =
          insert(:training_plan,
            business: coach.business,
            creator: coach.user,
            kind: kind,
            client: if(kind == :client_plan, do: client)
          )

        assert {:ok, archived} = Programming.archive_plan(ctx, plan.id, plan.revision)
        archived_record = Repo.get!(TrainingPlan, plan.id)
        assert {:ok, repeated} = Programming.archive_plan(ctx, plan.id, archived.revision)
        assert repeated.revision == archived.revision
        assert Repo.get!(TrainingPlan, plan.id) == archived_record
        assert {:error, %Ecto.Changeset{action: :stale_revision}} = Programming.archive_plan(ctx, plan.id, plan.revision)
        assert Repo.get!(TrainingPlan, plan.id) == archived_record

        assert {:ok, restored} = Programming.restore_plan(ctx, plan.id, archived.revision)
        restored_record = Repo.get!(TrainingPlan, plan.id)
        assert {:ok, repeated} = Programming.restore_plan(ctx, plan.id, restored.revision)
        assert repeated.revision == restored.revision
        assert Repo.get!(TrainingPlan, plan.id) == restored_record
        assert {:error, %Ecto.Changeset{action: :stale_revision}} = Programming.restore_plan(ctx, plan.id, archived.revision)
        assert Repo.get!(TrainingPlan, plan.id) == restored_record
      end
    end

    test "gets a populated Template and allows another coach in the business to inspect it" do
      coach = insert(:coach)
      colleague = insert(:coach, business: coach.business)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: template, position: 0)
      exercise = insert(:exercise, business: coach.business)

      prescription =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: workout,
          exercise: exercise,
          position: 0
        )

      insert(:workout_schedule,
        business: coach.business,
        plan: template,
        workout: workout,
        weekday: :friday
      )

      assert {:ok, loaded} = PlanReader.get_template(trainer_ctx(colleague), template.id)
      assert loaded.kind == :template
      assert loaded.revision == 1
      assert [%{id: workout_id, prescribed_exercises: [%{id: prescription_id}]}] = loaded.workouts
      assert workout_id == workout.id
      assert prescription_id == prescription.id
      assert [%{weekday: :friday, training_workout_id: ^workout_id}] = loaded.workout_schedule
    end

    test "updates metadata only at the expected revision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)

      assert {:ok, updated} =
               Programming.update_plan(ctx, template.id, 1, %{
                 "name" => "Updated Template",
                 "description" => "Updated metadata"
               })

      assert updated.name == "Updated Template"
      assert updated.description == "Updated metadata"
      assert updated.revision == 2

      assert {:error,
              %Ecto.Changeset{
                action: :stale_revision,
                data: %TrainingPlan{revision: 2}
              }} =
               Programming.update_plan(ctx, template.id, 1, %{"name" => "Lost write"})

      assert Repo.get!(TrainingPlan, template.id).name == "Updated Template"
    end

    test "rejects Client Plan fields when updating a Training Template" do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)

      assert {:error, changeset} =
               Programming.update_plan(trainer_ctx(coach), template.id, 1, %{
                 "start_date" => "not-a-date"
               })

      assert %{start_date: ["is not valid for a Training Template"]} = errors_on(changeset)
      assert Repo.get!(TrainingPlan, template.id).revision == 1
    end

    test "archives and restores explicitly with monotonic revisions" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)

      assert {:ok, archived} = Programming.archive_plan(ctx, template.id, 1)
      assert archived.archived_at
      assert archived.revision == 2

      assert {:error,
              %Ecto.Changeset{
                action: :stale_revision,
                data: %TrainingPlan{revision: 2}
              }} =
               Programming.restore_plan(ctx, template.id, 1)

      assert {:ok, restored} = Programming.restore_plan(ctx, template.id, 2)
      assert restored.archived_at == nil
      assert restored.revision == 3
    end

    test "deletes a Template without deleting its independent Client Plan" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, coach: coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)

      client_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          source_template: template,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      assert {:ok, deleted} = Programming.delete_plan(trainer_ctx(coach), template.id, 1)
      assert deleted.id == template.id
      assert Repo.get(TrainingPlan, template.id) == nil
      assert Repo.get!(TrainingPlan, client_plan.id).source_template_id == nil
    end

    test "conceals other-business plans and Client Plans" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      other_coach = insert(:coach)
      hidden = insert(:training_plan, business: other_coach.business, creator: other_coach.user)
      same_business_template = insert(:training_plan, business: coach.business, creator: coach.user)
      client = insert(:client, business: coach.business, coach: coach)

      client_ctx = %Easy.Ctx{
        business_id: client.business_id,
        user_id: client.user_id,
        client_id: client.id
      }

      client_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan
        )

      for id <- [hidden.id, client_plan.id] do
        assert {:error, :not_found} = PlanReader.get_template(ctx, id)
      end

      assert {:error, :not_found} = Programming.update_plan(ctx, hidden.id, 1, %{"name" => "Nope"})
      assert {:error, :not_found} = Programming.archive_plan(ctx, hidden.id, 1)
      assert {:error, :not_found} = Programming.restore_plan(ctx, hidden.id, 1)
      assert {:error, :not_found} = Programming.delete_plan(ctx, hidden.id, 1)

      assert {:error, :not_found} = PlanReader.get_template(client_ctx, same_business_template.id)
      assert {:error, :not_found} = Programming.update_plan(client_ctx, same_business_template.id, 1, %{})
      assert {:error, :not_found} = Programming.archive_plan(client_ctx, same_business_template.id, 1)
      assert {:error, :not_found} = Programming.restore_plan(client_ctx, same_business_template.id, 1)
      assert {:error, :not_found} = Programming.delete_plan(client_ctx, same_business_template.id, 1)
    end

    test "keeps an assigned Client Plan reachable through the shared lifecycle route" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, coach: coach)

      client_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      ctx = trainer_ctx(coach)

      assert {:ok, loaded} = PlanReader.get_plan(ctx, client_plan.id)
      assert loaded.kind == :client_plan

      assert {:ok, updated} =
               Programming.update_plan(ctx, client_plan.id, 1, %{
                 "start_date" => "2026-09-08",
                 "end_date" => "2026-10-08"
               })

      assert updated.start_date == ~D[2026-09-08]
      assert updated.end_date == ~D[2026-10-08]
      assert updated.revision == 2

      assert {:ok, archived} = Programming.archive_plan(ctx, client_plan.id, 2)
      assert archived.archived_at
      assert archived.revision == 3
    end

    test "returns a changeset when restoring a Client Plan would overlap Coverage" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, coach: coach)

      archived_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01],
          end_date: ~D[2026-09-30],
          archived_at: ~U[2026-08-15 12:00:00Z]
        )

      insert(:training_plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: ~D[2026-09-15],
        end_date: ~D[2026-10-15]
      )

      assert {:error, changeset} =
               Programming.restore_plan(trainer_ctx(coach), archived_plan.id, 1)

      assert %{start_date: [_]} = errors_on(changeset)
      persisted = Repo.get!(TrainingPlan, archived_plan.id)
      assert persisted.archived_at
      assert persisted.revision == 1
    end

    test "conceals a Client Plan before comparing its revision" do
      owner = insert(:coach)
      colleague = insert(:coach, business: owner.business)
      client = insert(:client, business: owner.business, coach: owner)

      client_plan =
        insert(:training_plan,
          business: owner.business,
          creator: owner.user,
          client: client,
          kind: :client_plan,
          revision: 7
        )

      ctx = trainer_ctx(colleague)

      assert {:error, :not_found} = PlanReader.get_plan(ctx, client_plan.id)
      assert {:error, :not_found} = Programming.update_plan(ctx, client_plan.id, 1, %{"name" => "Nope"})
      assert {:error, :not_found} = Programming.archive_plan(ctx, client_plan.id, 1)
      assert {:error, :not_found} = Programming.restore_plan(ctx, client_plan.id, 1)
      assert {:error, :not_found} = Programming.delete_plan(ctx, client_plan.id, 1)
    end
  end
end
