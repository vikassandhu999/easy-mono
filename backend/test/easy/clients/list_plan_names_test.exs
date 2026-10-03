defmodule Easy.Clients.ListPlanNamesTest do
  use Easy.SchemaCase

  alias Easy.Clients

  # The CL row's plan chips. Opt-in because the names cost two extra queries per
  # page and only the clients list wants them — every other caller of
  # `list_clients/2` must keep getting nil.
  describe "list_clients/2 include_plans" do
    setup do
      business = insert(:business)
      coach = insert(:coach, business: business)
      client = insert(:client, business: business, user: insert(:user))

      %{
        business: business,
        coach: coach,
        client: client,
        window: [start_date: Date.utc_today(), end_date: nil]
      }
    end

    test "is off by default", %{business: business, coach: coach, client: client, window: window} do
      insert(:training_plan, [business: business, creator: coach, client: client] ++ window)
      insert(:plan, business: business, creator: coach, client: client, status: :active, start_date: Date.utc_today())

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
      assert listed.training_plan_name == nil
      assert listed.nutrition_plan_name == nil
    end

    test "returns both plan names when asked", %{business: business, coach: coach, client: client, window: window} do
      insert(
        :training_plan,
        [business: business, creator: coach, client: client, name: "Strength base"] ++ window
      )

      insert(:plan,
        business: business,
        creator: coach,
        client: client,
        name: "Fat loss",
        status: :active,
        start_date: Date.utc_today()
      )

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business), include_plans: true)
      assert listed.training_plan_name == "Strength base"
      assert listed.nutrition_plan_name == "Fat loss"
    end

    test "leaves a kind nil when the client has no plan of it", %{
      business: business,
      coach: coach,
      client: client
    } do
      insert(:plan,
        business: business,
        creator: coach,
        client: client,
        name: "Fat loss",
        status: :active,
        start_date: Date.utc_today()
      )

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business), include_plans: true)
      assert listed.training_plan_name == nil
      assert listed.nutrition_plan_name == "Fat loss"
    end

    test "ignores archived plans and templates", %{business: business, coach: coach, client: client, window: window} do
      insert(
        :training_plan,
        [business: business, creator: coach, client: client, name: "Old block", archived_at: DateTime.utc_now(:second)] ++
          window
      )

      # A template — no client_id — must never leak onto a client's row.
      insert(:plan, business: business, creator: coach, name: "Template", status: :active)

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business), include_plans: true)
      assert listed.training_plan_name == nil
      assert listed.nutrition_plan_name == nil
    end

    test "ignores a plan whose date window has closed", %{business: business, coach: coach, client: client} do
      today = Date.utc_today()

      insert(:training_plan,
        business: business,
        creator: coach,
        client: client,
        name: "Finished block",
        start_date: Date.add(today, -30),
        end_date: Date.add(today, -1)
      )

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business), include_plans: true)
      assert listed.training_plan_name == nil
    end

    test "does not leak another business's plan onto a client", %{
      business: business,
      client: client
    } do
      other_business = insert(:business)
      other_coach = insert(:coach, business: other_business)
      other_client = insert(:client, business: other_business)

      insert(:training_plan,
        business: other_business,
        creator: other_coach,
        client: other_client,
        name: "Other tenant plan",
        start_date: Date.utc_today()
      )

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business), include_plans: true)
      assert listed.id == client.id
      assert listed.training_plan_name == nil
    end
  end
end
