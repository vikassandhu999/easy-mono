defmodule EasyWeb.Clients.CoachingGateTest do
  use Easy.ConnCase, async: true

  test "every mutating client route rejects ended coaching before validation" do
    client =
      insert(:client,
        terms: [
          build(:coaching_term, starts_on: Date.add(Date.utc_today(), -30), ends_on: Date.add(Date.utc_today(), -1))
        ]
      )

    for route <- EasyWeb.Router.__routes__(),
        String.starts_with?(route.path, "/v1/client/"),
        route.verb != :get do
      path =
        route.path
        |> String.replace(":date", Date.to_iso8601(Date.utc_today()))
        |> String.replace(~r/:[a-z_]+/, Ecto.UUID.generate())

      conn = build_conn() |> authenticate_client(client)
      response = Phoenix.ConnTest.dispatch(conn, @endpoint, route.verb, path, %{})
      assert %{"error_code" => "coaching_required"} = json_response(response, 403), "#{route.verb} #{route.path}"
    end

    profile = build_conn() |> authenticate_client(client) |> get("/v1/client/me") |> json_response(200)
    assert profile["data"]["state"] == "ended"
    assert profile["data"]["full_name"] == client.full_name
  end
end
