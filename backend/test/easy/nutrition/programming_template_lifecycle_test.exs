defmodule Easy.Nutrition.ProgrammingTemplateLifecycleTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Plan, Programming}
  alias Easy.Repo

  describe "Nutrition Template lifecycle" do
    test "updates metadata and targets only at the expected revision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:ok, updated} =
               Programming.update_template(ctx, template.id, 1, %{
                 "name" => "Updated Template",
                 "description" => "Updated metadata",
                 "target_calories" => 1800.0
               })

      assert updated.name == "Updated Template"
      assert updated.description == "Updated metadata"
      assert updated.target_calories == 1800.0
      assert updated.revision == 2
      assert [%{name: "Everyday"}] = updated.day_patterns

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Plan{revision: 2}}} =
               Programming.update_template(ctx, template.id, 1, %{"name" => "Lost write"})

      assert Repo.get!(Plan, template.id).name == "Updated Template"
    end

    test "rejects Client Plan fields when updating a Nutrition Template" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:error, changeset} =
               Programming.update_template(ctx, template.id, 1, %{"start_date" => "not-a-date"})

      assert %{start_date: ["is not valid for a Nutrition Template"]} = errors_on(changeset)
      assert Repo.get!(Plan, template.id).revision == 1
    end

    test "archives and restores explicitly with monotonic revisions" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:ok, archived} = Programming.archive_template(ctx, template.id, 1)
      assert archived.archived_at
      assert archived.revision == 2

      assert {:error, changeset} =
               Programming.update_template(ctx, template.id, 2, %{"name" => "Nope"})

      assert %{archived_at: ["is read-only"]} = errors_on(changeset)

      assert {:error, %Ecto.Changeset{action: :stale_revision, data: %Plan{revision: 2}}} =
               Programming.restore_template(ctx, template.id, 1)

      assert {:ok, restored} = Programming.restore_template(ctx, template.id, 2)
      assert restored.archived_at == nil
      assert restored.revision == 3
    end

    test "deletes a Template without deleting its independent Client Plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
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

      assert {:ok, deleted} = Programming.delete_template(ctx, template.id, 1)
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
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

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
        assert {:error, :not_found} = Programming.get_template(ctx, id)
        assert {:error, :not_found} = Programming.update_template(ctx, id, 1, %{"name" => "Nope"})
        assert {:error, :not_found} = Programming.archive_template(ctx, id, 1)
        assert {:error, :not_found} = Programming.restore_template(ctx, id, 1)
        assert {:error, :not_found} = Programming.delete_template(ctx, id, 1)
      end

      assert {:error, :not_found} = Programming.get_template(client_ctx, same_business.id)
    end

    test "deletes an active Template at the expected revision" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert {:error, %Ecto.Changeset{action: :stale_revision}} =
               Programming.delete_template(ctx, template.id, 9)

      assert {:ok, deleted} = Programming.delete_template(ctx, template.id, 1)
      assert deleted.id == template.id
      assert Repo.get(Plan, template.id) == nil

      Repo.query!("SET CONSTRAINTS ALL IMMEDIATE")
    end
  end
end
