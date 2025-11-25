defmodule EasyWeb.Plugs.PopulateScopeTest do
  use ExUnit.Case, async: true
  use Plug.Test

  alias Easy.Auth.Scope
  alias EasyWeb.Plugs.PopulateScope

  describe "PopulateScope plug" do
    test "populates scope from valid token claims" do
      # Create a test connection with token claims
      conn =
        conn(:get, "/")
        |> Plug.Conn.assign(:token_claims, %{
          "sub" => "user-uuid-123",
          "business_id" => "business-uuid-456",
          "coach_id" => "coach-uuid-789",
          "client_id" => nil,
          "roles" => ["coach"]
        })

      conn = PopulateScope.call(conn, PopulateScope.init([]))

      # Verify scope was assigned
      assert %Scope{} = conn.assigns.scope
      assert conn.assigns.scope.user_id == "user-uuid-123"
      assert conn.assigns.scope.business_id == "business-uuid-456"
      assert conn.assigns.scope.coach_id == "coach-uuid-789"
      assert conn.assigns.scope.client_id == nil
      assert conn.assigns.scope.roles == ["coach"]
    end

    test "populates scope for client role" do
      conn =
        conn(:get, "/")
        |> Plug.Conn.assign(:token_claims, %{
          "sub" => "user-uuid-abc",
          "business_id" => "business-uuid-def",
          "coach_id" => nil,
          "client_id" => "client-uuid-ghi",
          "roles" => ["client"]
        })

      conn = PopulateScope.call(conn, PopulateScope.init([]))

      assert %Scope{} = conn.assigns.scope
      assert conn.assigns.scope.user_id == "user-uuid-abc"
      assert conn.assigns.scope.client_id == "client-uuid-ghi"
      assert conn.assigns.scope.roles == ["client"]
    end

    test "returns 401 for invalid claims" do
      # Missing "sub" field
      conn =
        conn(:get, "/")
        |> Plug.Conn.assign(:token_claims, %{
          "business_id" => "business-uuid-456",
          "roles" => ["coach"]
        })

      conn = PopulateScope.call(conn, PopulateScope.init([]))

      # Should be halted with unauthorized response
      assert conn.halted
      assert conn.status == 401
    end

    test "handles scope without business context" do
      # User without business context (e.g., during onboarding)
      conn =
        conn(:get, "/")
        |> Plug.Conn.assign(:token_claims, %{
          "sub" => "user-uuid-new",
          "business_id" => nil,
          "coach_id" => nil,
          "client_id" => nil,
          "roles" => []
        })

      conn = PopulateScope.call(conn, PopulateScope.init([]))

      assert %Scope{} = conn.assigns.scope
      assert conn.assigns.scope.user_id == "user-uuid-new"
      assert conn.assigns.scope.business_id == nil
      refute Scope.has_business_context?(conn.assigns.scope)
    end
  end
end
