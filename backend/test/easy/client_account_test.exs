defmodule Easy.ClientAccountTest do
  use Easy.DataCase, async: true

  alias Easy.ClientAccount
  alias Easy.Clients.Client
  alias Easy.Ctx

  test "profile operations reject missing and cross-business client identities without writing" do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}

    for denied <- [
          %{ctx | client_id: nil},
          %{ctx | client_id: Ecto.UUID.generate()},
          %{ctx | business_id: insert(:business).id}
        ] do
      assert {:error, :not_found} = ClientAccount.get_client_account(denied)
      assert {:error, :not_found} = ClientAccount.get_client_calendar(denied)
      assert {:error, :not_found} = ClientAccount.get_client_account_profile(denied)
      assert {:error, :not_found} = ClientAccount.update_client_account_profile(denied, %{first_name: "Unexpected"})
    end

    assert Repo.get!(Client, client.id).first_name == client.first_name
  end

  test "client calendar follows the stored timezone on either side of UTC midnight" do
    for {timezone, now, expected} <- [
          {"Pacific/Kiritimati", ~U[2026-09-19 12:00:00Z], ~D[2026-09-20]},
          {"America/Los_Angeles", ~U[2026-09-19 00:30:00Z], ~D[2026-09-18]},
          {"America/Los_Angeles", ~U[2026-03-08 09:59:59Z], ~D[2026-03-08]},
          {"America/Los_Angeles", ~U[2026-03-08 10:00:00Z], ~D[2026-03-08]}
        ] do
      client = insert(:client, timezone: timezone)
      ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}
      assert {:ok, %{timezone: ^timezone, local_date: ^expected}} = ClientAccount.get_client_calendar(ctx, now)
    end
  end

  test "self-service changes ignore identities and coach-managed fields" do
    client = insert(:client, status: :active, notes: "Coach note")
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}

    assert {:ok, %{client: updated}} =
             ClientAccount.update_client_account_profile(ctx, %{
               first_name: "Updated",
               business_id: Ecto.UUID.generate(),
               user_id: Ecto.UUID.generate(),
               assigned_coach_id: Ecto.UUID.generate(),
               status: :inactive,
               notes: "Unexpected"
             })

    assert updated.first_name == "Updated"

    for field <- [:business_id, :user_id, :assigned_coach_id, :status, :notes] do
      assert Map.get(updated, field) == Map.get(client, field)
    end
  end

  test "active membership resolution requires the user and business to match an active client" do
    client = insert(:client, status: :active)
    inactive = insert(:client, business: client.business, status: :inactive, inactive_reason: :manual)
    ctx = Ctx.new(client.business_id, client.user_id)
    assert {:ok, %{id: id}} = ClientAccount.get_active_client(ctx)
    assert id == client.id

    for denied <- [
          %{ctx | user_id: Ecto.UUID.generate()},
          %{ctx | business_id: Ecto.UUID.generate()},
          %{ctx | user_id: inactive.user_id}
        ] do
      assert {:error, :not_found} = ClientAccount.get_active_client(denied)
    end
  end

  test "invitation and coach edits enforce the same stored-string limits" do
    client = build(:client)
    today = Date.utc_today()
    sent_at = DateTime.utc_now(:second)

    for field <- [:email, :first_name, :last_name, :phone, :notes],
        {length, expected} <- [{255, []}, {256, ["should be at most 255 character(s)"]}] do
      attrs = %{email: "client@example.test"} |> Map.put(field, String.duplicate("x", length))
      invited = Client.invite_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), sent_at, attrs)
      updated = Client.update_changeset(client, today, attrs)

      assert Map.get(errors_on(invited), field, []) == expected
      assert Map.get(errors_on(updated), field, []) == expected
    end
  end

  test "oversized self-service profile fields return validation errors without changing the client" do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    too_long = String.duplicate("e\u0301", 128)

    for field <- [:first_name, :last_name, :phone] do
      assert {:error, changeset} = ClientAccount.update_client_account_profile(ctx, %{field => too_long})
      assert errors_on(changeset)[field] == ["should be at most 255 character(s)"]
      assert Map.get(Repo.get!(Client, client.id), field) == Map.get(client, field)
    end
  end
end
