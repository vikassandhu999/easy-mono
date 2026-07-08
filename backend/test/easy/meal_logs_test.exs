defmodule Easy.MealLogsTest do
  use Easy.DataCase, async: true

  alias Easy.MealLogs

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)
      insert(:meal_log, business: business, client: client_b)

      %{business: business, trainer_a: trainer_a, client_b: client_b}
    end

    test "list_meal_logs_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} = MealLogs.list_meal_logs_for_client(trainer_ctx(trainer_a), client_b.id)
    end

    test "owner ctx succeeds", %{business: business, client_b: client_b} do
      assert {:ok, [_]} = MealLogs.list_meal_logs_for_client(owner_ctx(business), client_b.id)
    end
  end
end
