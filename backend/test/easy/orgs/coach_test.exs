defmodule Easy.Orgs.CoachTest do
  use Easy.SchemaCase, async: true
  alias Easy.Orgs.Coach

  test "coach invitations normalize email and derive invitation state from facts" do
    business = insert(:business)

    attrs = %{full_name: "A Coach", preferred_name: "A", email: "UPPER@EXAMPLE.TEST", user_id: Ecto.UUID.generate()}

    assert {:ok, coach} =
             business.id
             |> Coach.invite_changeset(DateTime.utc_now(:second), attrs)
             |> Repo.insert()

    assert coach.user_id == nil
    assert coach.email == "upper@example.test"
    assert coach.invite_token
    assert Coach.state(coach) == :invited
    assert Coach.full_name(coach) == "A"
    assert {:error, duplicate} = business.id |> Coach.invite_changeset(DateTime.utc_now(:second), %{full_name: "Other", email: "upper@example.test"}) |> Repo.insert()
    assert errors_on(duplicate).email == ["has already been taken"]
  end

  test "required full names and trusted identities are enforced" do
    refute Coach.insert_changeset(nil, nil, %{full_name: "Coach"}).valid?
    refute Coach.invite_changeset(Ecto.UUID.generate(), DateTime.utc_now(:second), %{email: "invalid"}).valid?
    coach = insert(:coach)
    assert Coach.state(coach) == :active
    assert {:ok, removed} = coach |> Coach.remove_changeset(Date.utc_today()) |> Repo.update()
    assert Coach.state(removed) == :removed
    refute Repo.exists?(Coach |> Coach.for_business(coach.business_id) |> Coach.active())
  end
end
