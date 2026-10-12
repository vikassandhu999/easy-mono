defmodule Easy.RevisionTest do
  use Easy.SchemaCase

  alias Easy.Plans.Template
  alias Easy.Repo
  alias Easy.Revision

  test "missing records do not invoke the mutation" do
    business = insert(:business)
    query = Template.for_business(business.id, :training)

    assert {:error, :not_found} =
             Revision.locked(query, Ecto.UUID.generate(), :any, fn _record ->
               flunk("mutation must not run for a missing record")
             end)
  end

  test "stale revisions preserve the record and do not invoke the mutation" do
    template = insert(:training_plan)

    assert {:error, changeset} =
             Revision.locked(Template.for_business(template.business_id, :training), template.id, template.revision + 1, fn _record ->
               flunk("mutation must not run for a stale revision")
             end)

    assert changeset.action == :stale_revision
    assert changeset.data.revision == template.revision
    assert %{revision: ["is stale"]} = errors_on(changeset)
    assert Repo.get!(Template, template.id).revision == template.revision
  end

  test "callback failures roll back writes and successful results commit" do
    template = insert(:training_plan)
    query = Template.for_business(template.business_id, :training)

    assert {:error, :rejected} =
             Revision.locked(query, template.id, template.revision, fn locked ->
               locked |> Ecto.Changeset.change(name: "Rolled back") |> Repo.update!()
               {:error, :rejected}
             end)

    assert Repo.get!(Template, template.id).name == template.name

    assert {:ok, updated} =
             Revision.locked(query, template.id, template.revision, fn locked ->
               locked |> Ecto.Changeset.change(name: "Saved") |> Repo.update()
             end)

    assert updated.name == "Saved"
    assert Repo.get!(Template, template.id).name == "Saved"
  end
end
