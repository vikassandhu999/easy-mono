defmodule Easy.Forms.FormTemplateTest do
  use Easy.SchemaCase, async: true

  alias Easy.Forms.FormTemplate

  test "create and update enforce the stored name limit using Unicode codepoints" do
    template = insert(:form_template)
    attrs = Map.take(template, [:purpose, :sections, :status])
    valid_name = String.duplicate("a", 255)
    too_long = String.duplicate("e\u0301", 128)

    assert String.length(too_long) == 128

    assert template.business_id
           |> FormTemplate.insert_changeset(Map.put(attrs, :name, valid_name))
           |> Map.fetch!(:valid?)

    assert FormTemplate.update_changeset(template, %{name: valid_name}).valid?

    assert {:error, creation} =
             template.business_id
             |> FormTemplate.insert_changeset(Map.put(attrs, :name, too_long))
             |> Repo.insert()

    assert {:error, update} = template |> FormTemplate.update_changeset(%{name: too_long}) |> Repo.update()
    assert errors_on(creation).name == ["should be at most 255 character(s)"]
    assert errors_on(update).name == errors_on(creation).name
    assert Repo.reload!(template).name == template.name
  end
end
