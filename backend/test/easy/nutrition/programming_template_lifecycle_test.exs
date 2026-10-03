defmodule Easy.Nutrition.ProgrammingTemplateLifecycleTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Plan, PlanReader, Programming}
  alias Easy.Repo

  describe "Nutrition Template lifecycle" do
    test "repeated lifecycle actions preserve templates and client plans" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, coach: coach)

      for kind <- [:template, :client_plan] do
        plan =
          insert(:plan,
            business: coach.business,
            creator: coach.user,
            kind: kind,
            client: if(kind == :client_plan, do: client)
          )

        assert {:ok, archived} = Programming.archive_plan(ctx, plan.id)
        archived_record = Repo.get!(Plan, plan.id)
        assert {:ok, repeated} = Programming.archive_plan(ctx, plan.id)
        assert repeated.revision == archived.revision
        assert Repo.get!(Plan, plan.id) == archived_record

        assert {:ok, restored} = Programming.restore_plan(ctx, plan.id)
        restored_record = Repo.get!(Plan, plan.id)
        assert {:ok, repeated} = Programming.restore_plan(ctx, plan.id)
        assert repeated.revision == restored.revision
        assert Repo.get!(Plan, plan.id) == restored_record
      end
    end

    test "updates metadata and targets only at the expected revision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:ok, updated} =
               Programming.update_plan(ctx, template.id, 1, %{
                 "name" => "Updated Template",
                 "description" => "Updated metadata",
                 "target_calories" => 1800.0
               })

      assert updated.name == "Updated Template"
      assert updated.description == "Updated metadata"
      assert updated.target_calories == 1800.0
      assert updated.revision == 2
      assert [%{name: "Everyday"}] = updated.menu.day_patterns

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Plan{revision: 2}}} =
               Programming.update_plan(ctx, template.id, 1, %{"name" => "Lost write"})

      assert Repo.get!(Plan, template.id).name == "Updated Template"
    end

    test "casts only template fields when updating a Nutrition Template" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:ok, updated} =
               Programming.update_plan(ctx, template.id, 1, %{"start_date" => "not-a-date"})

      assert updated.start_date == nil
      assert updated.revision == 2
    end

    test "archives and restores explicitly with monotonic revisions" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:ok, archived} = Programming.archive_plan(ctx, template.id)
      assert archived.archived_at
      assert archived.revision == 2

      assert {:error, changeset} =
               Programming.update_plan(ctx, template.id, 2, %{"name" => "Nope"})

      assert %{archived_at: ["is read-only"]} = errors_on(changeset)

      assert {:ok, restored} = Programming.restore_plan(ctx, template.id)
      assert restored.archived_at == nil
      assert restored.revision == 3
    end

    test "deletes a Template without deleting its independent Client Plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, coach: coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      client_plan =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          source_template: template,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      assert {:ok, deleted} = Programming.delete_plan(ctx, template.id)
      assert deleted.id == template.id
      assert Repo.get(Plan, template.id) == nil
      assert Repo.get!(Plan, client_plan.id).source_template_id == nil
    end

    test "conceals other-business plans and Client Plans" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      other = insert(:coach)
      hidden = insert(:plan, business: other.business, creator: other.user)
      same_business = insert(:plan, business: coach.business, creator: coach.user)
      client = insert(:client, business: coach.business, coach: coach)

      client_ctx = %Easy.Ctx{
        business_id: client.business_id,
        user_id: client.user_id,
        client_id: client.id
      }

      client_plan =
        insert(:plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan
        )

      for id <- [hidden.id, client_plan.id] do
        assert {:error, :not_found} = PlanReader.get_template(ctx, id)
      end

      assert {:error, :not_found} = Programming.update_plan(ctx, hidden.id, 1, %{"name" => "Nope"})
      assert {:error, :not_found} = Programming.archive_plan(ctx, hidden.id)
      assert {:error, :not_found} = Programming.restore_plan(ctx, hidden.id)
      assert {:error, :not_found} = Programming.delete_plan(ctx, hidden.id)

      assert {:error, :not_found} = PlanReader.get_template(client_ctx, same_business.id)
      assert {:error, :not_found} = Programming.update_plan(client_ctx, same_business.id, 1, %{})
      assert {:error, :not_found} = Programming.archive_plan(client_ctx, same_business.id)
      assert {:error, :not_found} = Programming.restore_plan(client_ctx, same_business.id)
      assert {:error, :not_found} = Programming.delete_plan(client_ctx, same_business.id)
    end

    test "deletes an active Template without a revision precondition" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:ok, deleted} = Programming.delete_plan(ctx, template.id)
      assert deleted.id == template.id
      assert Repo.get(Plan, template.id) == nil

      Repo.query!("SET CONSTRAINTS ALL IMMEDIATE")
    end
  end
end
