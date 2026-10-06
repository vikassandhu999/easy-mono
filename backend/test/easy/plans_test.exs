defmodule Easy.PlansTest do
  use Easy.DataCase, async: true

  alias Easy.Plans.{Programming, Reader}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    %{ctx: trainer_ctx(coach), client: client, today: Date.utc_today()}
  end

  test "training reads and mutations cannot reach nutrition templates or plans", f do
    template = insert(:training_plan, business: f.client.business, domain: :nutrition)
    plan = nutrition_plan(f)
    client_ctx = %Easy.Ctx{business_id: f.ctx.business_id, user_id: f.client.user_id, client_id: f.client.id}

    for id <- [template.id, plan.id] do
      assert {:error, :not_found} = Reader.get_plan(f.ctx, :training, id)
      assert {:error, :not_found} = Programming.update_plan(f.ctx, :training, id, 1, %{name: "Changed"})
      assert {:error, :not_found} = Programming.archive_plan(f.ctx, :training, id, 1)
      assert {:error, :not_found} = Programming.restore_plan(f.ctx, :training, id, 1)
      assert {:error, :forbidden} = Programming.delete_plan(f.ctx, :training, id, 1)
    end

    assert {:error, :not_found} = Reader.get_template(f.ctx, :training, template.id)
    assert {:error, :not_found} = Reader.get_client_plan(client_ctx, :training, plan.id)
    assert {:ok, %{data: [], count: 0}} = Reader.list_template_page(f.ctx, :training)
    assert {:ok, %{data: [], count: 0}} = Reader.list_plan_page_for_client(f.ctx, f.client.id, :training)
    assert {:ok, %{data: [], count: 0}} = Reader.list_client_plan_page(client_ctx, :training)
    assert {:ok, nil} = Reader.resolve_client_coverage(client_ctx, :training, f.today)
    assert Reader.revision_on(f.ctx, :training, plan.id, f.today) == nil

    assert {:error, :not_found} =
             Programming.assign_template_to_client(f.ctx, f.client.id, :training, template.id, %{start_date: f.today})

    assert {:error, :not_found} = Programming.duplicate_template(f.ctx, :training, template.id)
    assert {:error, :not_found} = Programming.withdraw_revision(f.ctx, :training, plan.id, hd(plan.revisions).id, 1)
  end

  test "training and nutrition may cover the same date but two training plans cannot", f do
    nutrition_plan(f)
    assert {:ok, template} = Programming.create_template(f.ctx, :training, %{name: "Training"})

    assert {:ok, training} =
             Programming.assign_template_to_client(f.ctx, f.client.id, :training, template.id, %{start_date: f.today})

    assert training.start_date == f.today

    assert {:error, :plan_overlap} =
             Programming.assign_template_to_client(f.ctx, f.client.id, :training, template.id, %{start_date: f.today})
  end

  test "revision lookup is tenant scoped", f do
    assert {:ok, template} = Programming.create_template(f.ctx, :training, %{name: "Training"})
    assert {:ok, plan} = Programming.assign_template_to_client(f.ctx, f.client.id, :training, template.id, %{})
    other_ctx = trainer_ctx(insert(:coach))
    assert Reader.revision_on(other_ctx, :training, plan.id, f.today) == nil
    unassigned_coach = trainer_ctx(insert(:coach, business: f.client.business))
    other_client = insert(:client, business: f.client.business, coach: f.client.coach)
    other_client_ctx = %Easy.Ctx{business_id: f.ctx.business_id, client_id: other_client.id, user_id: other_client.user_id}
    assert Reader.revision_on(unassigned_coach, :training, plan.id, f.today) == nil
    assert Reader.revision_on(other_client_ctx, :training, plan.id, f.today) == nil
    assert Reader.revision_on(f.ctx, :training, plan.id, f.today).id == plan.current_revision.id
  end

  defp nutrition_plan(f) do
    plan = build(:training_plan, business: f.client.business, client: f.client, start_date: f.today)
    plan = %{plan | domain: :nutrition, revisions: Enum.map(plan.revisions, &%{&1 | domain: :nutrition})}
    Repo.insert!(plan)
  end
end
