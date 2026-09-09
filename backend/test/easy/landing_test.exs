defmodule Easy.LandingTest do
  use Easy.DataCase, async: true

  alias Easy.Landing
  alias Easy.Landing.LandingPage

  test "upsert updates the same oldest draft that page reads select" do
    ctx = insert(:coach) |> trainer_ctx()
    now = DateTime.utc_now(:second)

    for suffix <- [2, 1] do
      assert {:ok, _page} =
               ctx.business_id
               |> LandingPage.insert_changeset(%{slug: "draft-#{suffix}", template: :proof_first, headline: "Original"})
               |> put_change(:id, "00000000-0000-0000-0000-00000000000#{suffix}")
               |> put_change(:inserted_at, now)
               |> Repo.insert()
    end

    assert {:ok, selected} = Landing.get_landing_page(ctx)
    assert selected.slug == "draft-1"
    assert {:ok, updated} = Landing.upsert_landing_page(ctx, %{headline: "Updated"})
    assert updated.id == selected.id
    assert updated.headline == "Updated"
    assert Repo.get_by!(LandingPage, slug: "draft-2").headline == "Original"
  end

  test "applications select only a program on the resolved page with either key format" do
    ctx = insert(:coach) |> trainer_ctx()
    other_ctx = insert(:coach) |> trainer_ctx()

    page_attrs = %{
      slug: "application-program",
      template: :proof_first,
      headline: "Coaching",
      status: :published,
      programs: [%{name: "Strength"}]
    }

    assert {:ok, page} = Landing.upsert_landing_page(ctx, page_attrs)
    assert {:ok, other_page} = Landing.upsert_landing_page(other_ctx, %{page_attrs | slug: "other-application"})
    [program] = page.programs
    [other_program] = other_page.programs

    attrs = %{name: "Applicant", email: "applicant@example.test", landing_program_id: program.id}

    for input <- [attrs, Jason.decode!(Jason.encode!(attrs))] do
      assert {:ok, result} = Landing.submit_application(page.slug, input)
      assert result.program.id == program.id
      assert result.prospect.landing_program_id == program.id
      assert result.prospect.business_id == ctx.business_id
    end

    for program_id <- [nil, "invalid", Ecto.UUID.generate(), other_program.id] do
      assert {:ok, %{program: nil, prospect: prospect}} =
               Landing.submit_application(page.slug, %{attrs | landing_program_id: program_id})

      assert prospect.landing_program_id == nil
      assert prospect.landing_page_id == page.id
      assert prospect.business_id == ctx.business_id
    end
  end

  test "string-keyed upserts replace programs and omission still clears them" do
    ctx = insert(:coach) |> trainer_ctx()

    assert {:ok, page} =
             Landing.upsert_landing_page(ctx, %{
               "slug" => "program-inputs",
               "template" => "proof_first",
               "headline" => "Coaching",
               "programs" => [%{"name" => "Strength"}]
             })

    assert [%{name: "Strength", position: 0}] = page.programs

    assert {:ok, updated} = Landing.upsert_landing_page(ctx, %{"programs" => [%{"name" => "Fitness"}]})
    assert updated.id == page.id
    assert [%{name: "Fitness", position: 0}] = updated.programs

    assert {:ok, %{programs: []}} = Landing.upsert_landing_page(ctx, %{"headline" => "Updated"})
  end

  test "invalid program collections return errors without changing the page" do
    ctx = insert(:coach) |> trainer_ctx()

    assert {:ok, original} =
             Landing.upsert_landing_page(ctx, %{
               slug: "invalid-program-inputs",
               template: :proof_first,
               headline: "Original",
               programs: [%{name: "Keep"}]
             })

    for programs <- [nil, "invalid", %{}, [nil], [42]] do
      assert {:error, changeset} =
               Landing.upsert_landing_page(ctx, %{headline: "Changed", programs: programs})

      assert %{programs: ["is invalid"]} = errors_on(changeset)
    end

    assert {:error, :too_many_programs} =
             Landing.upsert_landing_page(ctx, %{programs: List.duplicate(%{name: "Extra"}, 4)})

    assert {:ok, restored} = Landing.get_landing_page(ctx)
    assert restored.headline == original.headline
    assert restored.programs == original.programs
  end
end
