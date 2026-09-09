defmodule Easy.RevisionTest do
  use Easy.SchemaCase

  alias Easy.Nutrition.Food
  alias Easy.Repo
  alias Easy.Revision

  test "missing records do not invoke the mutation" do
    business = insert(:business)
    query = Food.for_business(business.id)

    assert {:error, :not_found} =
             Revision.locked(query, Ecto.UUID.generate(), :any, fn _record ->
               flunk("mutation must not run for a missing record")
             end)
  end

  test "stale revisions preserve the record and do not invoke the mutation" do
    food = insert(:food)

    assert {:error, changeset} =
             Revision.locked(Food.for_business(food.business_id), food.id, food.revision + 1, fn _record ->
               flunk("mutation must not run for a stale revision")
             end)

    assert changeset.action == :stale_revision
    assert changeset.data.revision == food.revision
    assert %{revision: ["is stale"]} = errors_on(changeset)
    assert Repo.get!(Food, food.id).revision == food.revision
  end

  test "callback failures roll back writes and successful results commit" do
    food = insert(:food)
    query = Food.for_business(food.business_id)

    assert {:error, :rejected} =
             Revision.locked(query, food.id, food.revision, fn locked ->
               locked |> Ecto.Changeset.change(name: "Rolled back") |> Repo.update!()
               {:error, :rejected}
             end)

    assert Repo.get!(Food, food.id).name == food.name

    assert {:ok, updated} =
             Revision.locked(query, food.id, food.revision, fn locked ->
               locked |> Ecto.Changeset.change(name: "Saved") |> Repo.update()
             end)

    assert updated.name == "Saved"
    assert Repo.get!(Food, food.id).name == "Saved"
  end
end
