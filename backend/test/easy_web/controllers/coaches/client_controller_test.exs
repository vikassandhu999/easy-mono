defmodule EasyWeb.Coaches.ClientControllerTest do
  use Easy.ConnCase, async: true
  alias Easy.{ClientInvitations, Repo}

  setup %{conn: conn} do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    %{business: business, coach: coach, conn: authenticate_coach(conn, coach)}
  end

  test "invite, resend and revoke expose canonical invitation facts", %{conn: conn} do
    response = post(conn, "/v1/coach/clients", %{full_name: "Client Full", preferred_name: "Client", email: "new@example.test"}) |> json_response(201)
    client = response["data"]
    assert client["state"] == "invited"
    assert client["full_name"] == "Client Full"
    assert client["preferred_name"] == "Client"
    assert client["terms"] == []
    assert client["current_term"] == nil
    assert client["invite_url"]
    assert %{"data" => resent} = post(conn, "/v1/coach/clients/#{client["id"]}/invite") |> json_response(200)
    assert resent["invite_url"] != client["invite_url"]
    assert delete(conn, "/v1/coach/clients/#{client["id"]}").status == 204
    assert get(conn, "/v1/coach/clients/#{client["id"]}") |> json_response(404)
  end

  test "terms start, end today and clear dates through resource routes", %{conn: conn, business: business, coach: coach} do
    client = insert(:client, business: business, coach: coach, terms: [])
    assert %{"data" => term} = post(conn, "/v1/coach/clients/#{client.id}/terms") |> json_response(201)
    assert term["starts_on"] == Date.to_iso8601(Date.utc_today())
    assert %{"data" => ending} = patch(conn, "/v1/coach/terms/#{term["id"]}", %{ends_on: term["starts_on"]}) |> json_response(200)
    assert ending["ends_on"] == term["starts_on"]
    assert %{"data" => profile} = get(conn, "/v1/coach/clients/#{client.id}") |> json_response(200)
    assert profile["state"] == "ending_soon"
    assert length(profile["terms"]) == 1
    assert post(conn, "/v1/coach/clients/#{client.id}/terms") |> json_response(409)
    assert %{"data" => %{"ends_on" => nil}} = patch(conn, "/v1/coach/terms/#{term["id"]}", %{ends_on: nil}) |> json_response(200)
  end

  test "profile and lists use client names, state, q and coach filters", %{conn: conn, business: business, coach: coach} do
    client = insert(:client, business: business, coach: coach, full_name: "Client Name", preferred_name: "Short")
    assert %{"data" => data} = patch(conn, "/v1/coach/clients/#{client.id}", %{timezone: nil, unit_system: "imperial"}) |> json_response(200)
    assert data["full_name"] == "Client Name"
    assert data["unit_system"] == "imperial"
    assert data["timezone"] == nil

    assert %{"count" => 1, "data" => [listed], "summary" => %{"active" => 1, "invited" => 0, "ended" => 0, "joined" => 0, "ending_soon" => 0}} =
             get(conn, "/v1/coach/clients", %{state: "active", q: "Short", coach_id: coach.id}) |> json_response(200)

    assert listed["id"] == client.id
    foreign = insert(:client)
    assert get(conn, "/v1/coach/clients/#{foreign.id}") |> json_response(404)
    assert patch(conn, "/v1/coach/clients/#{foreign.id}", %{full_name: "Forbidden"}) |> json_response(404)
    assert post(conn, "/v1/coach/clients/#{foreign.id}/terms") |> json_response(404)
    assert post(conn, "/v1/coach/clients", %{full_name: "No Email"}) |> json_response(422)
    assert patch(conn, "/v1/coach/clients/#{client.id}", %{status: "inactive"}) |> json_response(422)
  end

  test "expired client invitations renew and accepted accounts cannot be revoked", %{conn: conn, business: business, coach: coach} do
    invited = insert(:client, business: business, coach: coach, user: nil, invited_at: DateTime.add(DateTime.utc_now(:second), -31, :day), invite_token: "expired-token")
    assert {:error, :expired} = ClientInvitations.resolve_invitation_token(invited.invite_token)
    assert post(conn, "/v1/coach/clients/#{invited.id}/invite") |> json_response(200)
    updated = Repo.get!(Easy.Clients.Client, invited.id)
    assert {:ok, _} = ClientInvitations.resolve_invitation_token(updated.invite_token)
    accepted = insert(:client, business: business, coach: coach)
    assert delete(conn, "/v1/coach/clients/#{accepted.id}") |> json_response(422)
  end
end
