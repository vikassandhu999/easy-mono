defmodule Easy.NutritionPlans.AssignedClientCountTest do
  use Easy.SchemaCase

  alias Easy.NutritionPlans

  # Assignment copies a template and points `source_template_id` back at it, so the
  # library row's `· N clients` is the distinct clients among those copies.
  describe "list_template_plans/2 assigned_client_count" do
    setup do
      business = insert(:business)
      coach = insert(:coach, business: business)
      template = insert(:plan, business: business, creator: coach, client: nil)

      %{business: business, coach: coach, template: template}
    end

    test "is zero for a template nobody is on", %{business: business, template: template} do
      assert {:ok, %{plans: plans}} = NutritionPlans.list_template_plans(owner_ctx(business))
      assert Enum.find(plans, &(&1.id == template.id)).assigned_client_count == 0
    end

    test "counts a client once and ignores a copy they have come off", %{
      business: business,
      coach: coach,
      template: template
    } do
      one = insert(:client, business: business, creator: coach, user: insert(:user))
      two = insert(:client, business: business, creator: coach, user: insert(:user))
      gone = insert(:client, business: business, creator: coach, user: insert(:user))

      for client <- [one, two] do
        insert(:plan,
          business: business,
          creator: coach,
          client: client,
          source_template_id: template.id,
          status: :active
        )
      end

      # Off the plan: an archived copy is history, not a current assignment.
      insert(:plan,
        business: business,
        creator: coach,
        client: gone,
        source_template_id: template.id,
        status: :archived
      )

      assert {:ok, %{plans: plans}} = NutritionPlans.list_template_plans(owner_ctx(business))
      assert Enum.find(plans, &(&1.id == template.id)).assigned_client_count == 2
    end

    test "does not count a copy from another business", %{business: business, template: template} do
      other_business = insert(:business)
      other_coach = insert(:coach, business: other_business)
      other_client = insert(:client, business: other_business, creator: other_coach, user: insert(:user))

      insert(:plan,
        business: other_business,
        creator: other_coach,
        client: other_client,
        source_template_id: template.id
      )

      assert {:ok, %{plans: plans}} = NutritionPlans.list_template_plans(owner_ctx(business))
      assert Enum.find(plans, &(&1.id == template.id)).assigned_client_count == 0
    end

    test "the count query still reports the number of TEMPLATES, not of copies", %{
      business: business,
      coach: coach,
      template: template
    } do
      client = insert(:client, business: business, creator: coach, user: insert(:user))

      insert(:plan,
        business: business,
        creator: coach,
        client: client,
        source_template_id: template.id
      )

      assert {:ok, %{count: count, plans: plans}} = NutritionPlans.list_template_plans(owner_ctx(business))
      assert count == 1
      assert length(plans) == 1
    end
  end
end
