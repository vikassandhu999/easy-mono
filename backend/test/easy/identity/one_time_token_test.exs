defmodule Easy.Identity.OneTimeTokenTest do
  use Easy.SchemaCase, async: true

  alias Easy.Identity.OneTimeToken

  test "required token attributes fail validation before persistence" do
    assert {:error, changeset} = nil |> OneTimeToken.insert_changeset(%{}) |> Repo.insert()

    assert errors_on(changeset) == %{
             token_type: ["can't be blank"],
             token_hash: ["can't be blank"],
             relates_to: ["can't be blank"]
           }
  end

  test "invitation tokens permit a missing user and never cast a submitted user id" do
    attrs = Map.put(token_attrs(), :user_id, Ecto.UUID.generate())
    assert {:ok, token} = nil |> OneTimeToken.insert_changeset(attrs) |> Repo.insert()
    assert is_nil(token.user_id)
  end

  test "duplicate token hashes return a changeset" do
    attrs = token_attrs()
    assert {:ok, _token} = nil |> OneTimeToken.insert_changeset(attrs) |> Repo.insert()
    assert {:error, changeset} = nil |> OneTimeToken.insert_changeset(attrs) |> Repo.insert()
    assert errors_on(changeset).token_hash == ["has already been taken"]
  end

  test "a missing trusted user returns a changeset" do
    assert {:error, changeset} =
             Ecto.UUID.generate() |> OneTimeToken.insert_changeset(token_attrs()) |> Repo.insert()

    assert errors_on(changeset).user_id == ["does not exist"]
  end

  test "all one-time code types expire at the exact ten-minute boundary" do
    for type <- [:authentication, :email_confirmation, :invitation_acceptance] do
      token = %OneTimeToken{token_type: type, inserted_at: ~U[2026-09-08 12:00:00Z]}

      refute OneTimeToken.expired?(token, ~U[2026-09-08 12:09:59Z])
      assert OneTimeToken.expired?(token, ~U[2026-09-08 12:10:00Z])
      assert OneTimeToken.expired?(token, ~U[2026-09-08 12:10:59Z])
    end
  end

  defp token_attrs do
    %{token_type: :invitation_acceptance, token_hash: Ecto.UUID.generate(), relates_to: "invitee@test.com"}
  end
end
