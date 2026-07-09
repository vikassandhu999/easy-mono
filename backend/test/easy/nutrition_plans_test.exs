defmodule Easy.NutritionPlansTest do
  use Easy.DataCase, async: true

  alias Easy.Clients.Client
  alias Easy.NutritionPlans

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)

      template_a = insert(:plan, business: business, creator: trainer_a)
      template_b = insert(:plan, business: business, creator: trainer_b)

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
               NutritionPlans.list_plans_for_client(trainer_ctx(trainer_a), client_b.id)
    end

    test "assign_plan_to_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b,
      template_a: template_a
    } do
      assert {:error, :not_found} =
               NutritionPlans.assign_plan_to_client(trainer_ctx(trainer_a), client_b.id, template_a.id, %{})
    end

    test "get_plan_full returns :not_found when the plan's client belongs to another trainer", %{
      trainer_a: trainer_a,
      trainer_b: trainer_b,
      client_b: client_b,
      template_b: template_b
    } do
      {:ok, assigned_plan} =
        NutritionPlans.assign_plan_to_client(trainer_ctx(trainer_b), client_b.id, template_b.id, %{})

      assert {:error, :not_found} = NutritionPlans.get_plan_full(trainer_ctx(trainer_a), assigned_plan.id)
    end

    test "owner ctx succeeds on all three", %{
      business: business,
      client_b: client_b,
      template_a: template_a
    } do
      ctx = owner_ctx(business)

      assert {:ok, %{count: _, plans: _}} = NutritionPlans.list_plans_for_client(ctx, client_b.id)

      assert {:ok, assigned_plan} =
               NutritionPlans.assign_plan_to_client(ctx, client_b.id, template_a.id, %{})

      assert {:ok, %{id: id}} = NutritionPlans.get_plan_full(ctx, assigned_plan.id)
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

      assert {:ok, _assigned} = NutritionPlans.assign_plan_to_client(ctx, client.id, template_a.id, %{})
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

      assert {:ok, _assigned} = NutritionPlans.assign_plan_to_client(ctx, client.id, template_a.id, %{})
      assert Repo.get!(Client, client.id).stage == :coaching
    end

    test "a template plan (client_id nil) is fully visible to every trainer — shared library", %{
      trainer_a: trainer_a,
      template_b: template_b
    } do
      assert {:ok, %{id: id, client_id: nil}} =
               NutritionPlans.get_plan_full(trainer_ctx(trainer_a), template_b.id)

      assert id == template_b.id
    end
  end
end
