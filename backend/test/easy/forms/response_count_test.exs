defmodule Easy.Forms.ResponseCountTest do
  use Easy.SchemaCase

  alias Easy.Forms.Templates

  # The FM row reads `{Type} · {n} questions · {m} responses`. A submission belongs
  # to an ASSIGNMENT, not to the template, so the count walks both hops.
  describe "list_form_templates/1 response_count" do
    setup do
      business = insert(:business)
      coach = insert(:coach, business: business)
      client = insert(:client, business: business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: business)

      %{business: business, client: client, coach: coach, template: template}
    end

    test "is zero for a form nobody has filled in", %{business: business, template: template} do
      assert {:ok, templates} = Templates.list(owner_ctx(business))
      assert Enum.find(templates, &(&1.id == template.id)).response_count == 0
    end

    test "counts every submission across assignments", %{
      business: business,
      client: client,
      template: template
    } do
      for _ <- 1..3 do
        assignment = insert(:form_assignment, business: business, client: client, form_template: template)
        insert(:form_submission, business: business, client: client, form_assignment: assignment)
      end

      assert {:ok, templates} = Templates.list(owner_ctx(business))
      assert Enum.find(templates, &(&1.id == template.id)).response_count == 3
    end

    test "does not count another business's submissions", %{business: business, template: template} do
      other_business = insert(:business)
      other_coach = insert(:coach, business: other_business)
      other_client = insert(:client, business: other_business, creator: other_coach, user: insert(:user))
      other_template = insert(:form_template, business: other_business)

      other_assignment =
        insert(:form_assignment, business: other_business, client: other_client, form_template: other_template)

      insert(:form_submission, business: other_business, client: other_client, form_assignment: other_assignment)

      assert {:ok, templates} = Templates.list(owner_ctx(business))
      assert Enum.find(templates, &(&1.id == template.id)).response_count == 0
    end
  end
end
