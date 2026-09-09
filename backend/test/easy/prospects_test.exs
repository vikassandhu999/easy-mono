defmodule Easy.ProspectsTest do
  use Easy.DataCase, async: true

  alias Easy.Landing
  alias Easy.Prospects

  test "foreign tenants cannot read, update, or enroll a prospect" do
    ctx = insert(:coach) |> trainer_ctx()
    other_ctx = insert(:coach) |> trainer_ctx()
    page = publish_page(ctx, "prospect-isolation")

    assert {:ok, %{prospect: prospect}} =
             Landing.submit_application(page.slug, %{name: "Applicant", email: "applicant@example.test"})

    assert {:error, :not_found} = Prospects.get_prospect(other_ctx, prospect.id)
    assert {:error, :not_found} = Prospects.update_prospect(other_ctx, prospect.id, %{status: :lost})
    assert {:error, :not_found} = Prospects.enroll_prospect(other_ctx, prospect.id, %{})
    assert {:ok, %{status: :new, client_id: nil}} = Prospects.get_prospect(ctx, prospect.id)
  end

  test "application strings and coach notes respect database lengths before persistence" do
    ctx = insert(:coach) |> trainer_ctx()
    page = publish_page(ctx, "prospect-lengths")
    too_long = String.duplicate("e\u0301", 128)

    for field <- [:name, :phone, :email, :instagram] do
      attrs = %{name: "Applicant", email: "applicant@example.test"} |> Map.put(field, too_long)
      assert {:error, changeset} = Landing.submit_application(page.slug, attrs)
      assert errors_on(changeset)[field] == ["should be at most 255 character(s)"]
    end

    assert {:ok, %{count: 0}} = Prospects.list_prospects(ctx)

    assert {:ok, %{prospect: prospect}} =
             Landing.submit_application(page.slug, %{name: String.duplicate("x", 255), phone: "123"})

    assert {:ok, updated} = Prospects.update_prospect(ctx, prospect.id, %{status: :reviewing, notes: "Reviewed"})
    assert updated.status == :reviewing
    assert updated.notes == "Reviewed"
    assert updated.landing_page.id == page.id

    assert {:error, changeset} = Prospects.update_prospect(ctx, prospect.id, %{notes: too_long})
    assert errors_on(changeset).notes == ["should be at most 255 character(s)"]
    assert {:ok, %{notes: "Reviewed"}} = Prospects.get_prospect(ctx, prospect.id)
  end

  test "prospect pagination defaults to twenty and allows up to one hundred" do
    ctx = insert(:coach) |> trainer_ctx()
    page = publish_page(ctx, "prospect-pagination")

    for _ <- 1..105 do
      assert {:ok, _application} =
               Landing.submit_application(page.slug, %{name: "Applicant", email: "applicant@example.test"})
    end

    for {opts, expected_size} <- [{[], 20}, {[limit: 25], 25}, {[limit: 500], 100}, {[offset: 100], 5}] do
      assert {:ok, %{count: 105, prospects: prospects}} = Prospects.list_prospects(ctx, opts)
      assert length(prospects) == expected_size
    end
  end

  test "enrollment applies coach overrides with atom or string keys" do
    ctx = insert(:coach) |> trainer_ctx()
    page = publish_page(ctx, "enrollment-overrides")

    for key_format <- [:atoms, :strings] do
      assert {:ok, %{prospect: prospect}} =
               Landing.submit_application(page.slug, %{
                 name: "Original Name",
                 email: "original-#{key_format}@example.test",
                 phone: "9876543210"
               })

      attrs = %{first_name: "Updated", email: "updated-#{key_format}@example.test"}
      attrs = if key_format == :strings, do: Jason.decode!(Jason.encode!(attrs)), else: attrs

      assert {:ok, %{client: client, prospect: enrolled, already_enrolled: false}} =
               Prospects.enroll_prospect(ctx, prospect.id, attrs)

      assert client.first_name == "Updated"
      assert client.last_name == "Name"
      assert client.email == "updated-#{key_format}@example.test"
      assert client.phone == "9876543210"
      assert enrolled.client_id == client.id
      assert enrolled.status == :won
    end
  end

  test "status summaries cover the business independently of the list filter" do
    ctx = insert(:coach) |> trainer_ctx()
    other_ctx = insert(:coach) |> trainer_ctx()
    page = publish_page(ctx, "prospect-counts")
    other_page = publish_page(other_ctx, "other-prospect-counts")

    assert {:ok, %{summary: %{new: 0, reviewing: 0, won: 0, lost: 0}}} = Prospects.list_prospects(ctx)

    for status <- [:new, :new, :reviewing, :won, :lost] do
      assert {:ok, %{prospect: prospect}} =
               Landing.submit_application(page.slug, %{name: "Applicant", email: "applicant@example.test"})

      assert {:ok, _prospect} = Prospects.update_prospect(ctx, prospect.id, %{status: status})
    end

    assert {:ok, _application} =
             Landing.submit_application(other_page.slug, %{name: "Other applicant", email: "other@example.test"})

    assert {:ok, result} = Prospects.list_prospects(ctx, status: :new)
    assert result.count == 2
    assert length(result.prospects) == 2
    assert Enum.all?(result.prospects, &(&1.business_id == ctx.business_id and &1.status == :new))
    assert result.summary == %{new: 2, reviewing: 1, won: 1, lost: 1}
  end

  defp publish_page(ctx, slug) do
    {:ok, page} =
      Landing.upsert_landing_page(ctx, %{
        slug: slug,
        template: :proof_first,
        headline: "Coaching",
        status: :published
      })

    page
  end
end
