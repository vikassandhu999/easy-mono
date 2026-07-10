defmodule Easy.Orgs.DashboardSetupTest do
  use Easy.DataCase

  alias Easy.Orgs

  describe "update_dashboard_setup/2" do
    test "stores and clears a dismissed state for the business owner" do
      business = insert(:business)
      ctx = owner_ctx(business)

      assert {:ok, dismissed} =
               Orgs.update_dashboard_setup(ctx, %{
                 dashboard_setup_hidden_reason: "dismissed"
               })

      assert dismissed.dashboard_setup_hidden_reason == :dismissed
      assert %DateTime{} = dismissed.dashboard_setup_hidden_at

      assert {:ok, restored} =
               Orgs.update_dashboard_setup(ctx, %{
                 dashboard_setup_hidden_reason: nil
               })

      assert restored.dashboard_setup_hidden_reason == nil
      assert restored.dashboard_setup_hidden_at == nil
    end

    test "completed is latched and cannot be cleared or replaced" do
      business = insert(:business)
      ctx = owner_ctx(business)

      assert {:ok, completed} =
               Orgs.update_dashboard_setup(ctx, %{
                 dashboard_setup_hidden_reason: "completed"
               })

      assert completed.dashboard_setup_hidden_reason == :completed
      assert %DateTime{} = completed.dashboard_setup_hidden_at

      assert {:ok, still_completed} =
               Orgs.update_dashboard_setup(ctx, %{
                 dashboard_setup_hidden_reason: nil
               })

      assert still_completed.dashboard_setup_hidden_reason == :completed
      assert still_completed.dashboard_setup_hidden_at == completed.dashboard_setup_hidden_at

      assert {:ok, still_completed} =
               Orgs.update_dashboard_setup(ctx, %{
                 dashboard_setup_hidden_reason: "dismissed"
               })

      assert still_completed.dashboard_setup_hidden_reason == :completed
      assert still_completed.dashboard_setup_hidden_at == completed.dashboard_setup_hidden_at
    end

    test "rejects a non-owner without changing the business" do
      business = insert(:business)
      trainer = insert(:coach, business: business)

      assert {:error, :not_owner} =
               Orgs.update_dashboard_setup(trainer_ctx(trainer), %{
                 dashboard_setup_hidden_reason: "dismissed"
               })

      unchanged = Repo.get!(Easy.Orgs.Business, business.id)
      assert unchanged.dashboard_setup_hidden_reason == nil
      assert unchanged.dashboard_setup_hidden_at == nil
    end
  end
end
