defmodule Easy.Landing do
  # Coach landing funnel: a published landing page, sales Programs, public applications,
  # and the Prospects they create. Tenant scope always comes from %Ctx{} or the resolved
  # page — never from request bodies.

  import Ecto.Query

  alias Easy.Ctx
  alias Easy.Landing.{LandingPage, LandingProgram, Prospect}
  alias Easy.LandingApplicationQuestions
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Revision

  # ── Coach: landing page ────────────────────────────────────────────────────

  # V1 has one page per business, so the coach "landing page" is that single page (or nil).
  @spec get_landing_page(Ctx.t()) :: {:ok, LandingPage.t() | nil}
  def get_landing_page(%Ctx{} = ctx) do
    page =
      ctx
      |> page_query()
      |> LandingPage.include_programs()
      |> Repo.one()

    {:ok, page}
  end

  # Programs keep their identities; removed offers remain available to past applications.
  @spec upsert_landing_page(Ctx.t(), map()) ::
          {:ok, LandingPage.t()} | {:error, :too_many_programs | Ecto.Changeset.t()}
  def upsert_landing_page(%Ctx{} = ctx, attrs) do
    with {:ok, programs} <- LandingPage.program_inputs(attrs) do
      Repo.transact(fn -> do_upsert(ctx, attrs, programs) end)
    end
  end

  defp do_upsert(ctx, attrs, programs) do
    Repo.one(from(b in Business, where: b.id == ^ctx.business_id, lock: "FOR UPDATE"))

    with {:ok, page} <- insert_or_update_page(ctx, attrs),
         {:ok, _programs} <- sync_programs(ctx.business_id, page.id, programs) do
      get_landing_page(ctx)
    end
  end

  defp insert_or_update_page(ctx, attrs) do
    case Repo.one(page_query(ctx)) do
      nil ->
        with :ok <- check_revision(%LandingPage{revision: 0}, attrs) do
          ctx.business_id |> LandingPage.insert_changeset(attrs) |> Repo.insert()
        end

      page ->
        with :ok <- check_revision(page, attrs) do
          page |> LandingPage.update_changeset(attrs) |> Repo.update()
        end
    end
  end

  defp page_query(%Ctx{} = ctx) do
    LandingPage
    |> LandingPage.for_business(ctx.business_id)
    |> LandingPage.oldest()
    |> limit(1)
  end

  defp sync_programs(business_id, page_id, programs) do
    query =
      business_id
      |> LandingProgram.for_business()
      |> LandingProgram.for_landing_page(page_id)
      |> LandingProgram.active()

    existing = query |> Repo.all() |> Map.new(&{&1.id, &1})

    indexed = Enum.with_index(programs)

    with {:ok, saved} <- Result.traverse(indexed, &save_program(&1, existing, business_id, page_id)),
         ids = Enum.map(saved, & &1.id),
         true <- length(ids) == MapSet.size(MapSet.new(ids)) do
      query |> where([program], program.id not in ^ids) |> Repo.update_all(set: [archived_at: DateTime.utc_now(:second)])
      {:ok, saved}
    else
      false -> {:error, :invalid_input}
      error -> error
    end
  end

  defp save_program({attrs, index}, existing, business_id, page_id) do
    with {:ok, id} <- LandingProgram.input_id(attrs) do
      case {id, Map.get(existing, id)} do
        {nil, _} -> business_id |> LandingProgram.insert_changeset(page_id, index, attrs) |> Repo.insert()
        {_id, nil} -> {:error, :invalid_input}
        {_id, program} -> program |> LandingProgram.update_changeset(index, attrs) |> Repo.update()
      end
    end
  end

  defp check_revision(page, attrs) do
    input = Ecto.Changeset.cast({%{}, %{expected_revision: :integer}}, attrs, [:expected_revision])

    with {:ok, fields} <- Ecto.Changeset.apply_action(input, :update) do
      Revision.check(page, Map.get(fields, :expected_revision, :any))
    end
  end

  # ── Public: render + apply ─────────────────────────────────────────────────

  @spec preview_landing_page(String.t()) ::
          {:ok, %{page: LandingPage.t(), business: Business.t()}} | {:error, :not_found}
  def preview_landing_page(slug) do
    page =
      LandingPage
      |> LandingPage.for_slug(slug)
      |> LandingPage.published()
      |> LandingPage.include_programs()
      |> LandingPage.include_business()
      |> Repo.one()

    case page do
      nil -> {:error, :not_found}
      page -> {:ok, %{page: page, business: page.business}}
    end
  end

  @spec submit_application(String.t(), map()) ::
          {:ok, %{prospect: Prospect.t(), business: Business.t(), program: LandingProgram.t() | nil}}
          | {:error, :not_found | Ecto.Changeset.t()}
  def submit_application(slug, attrs) do
    Repo.transact(fn ->
      with {:ok, request} <- Prospect.application_request(attrs),
           %LandingPage{} = page <- application_page(slug, request.page_id) do
        Repo.one(from(b in Business, where: b.id == ^page.business_id, lock: "FOR UPDATE"))
        recover_or_insert_application(page, slug, attrs, request)
      else
        nil -> {:error, :not_found}
        error -> error
      end
    end)
  end

  defp application_page(slug, nil), do: LandingPage.for_slug(slug) |> LandingPage.include_business() |> Repo.one()
  defp application_page(_slug, id), do: LandingPage |> LandingPage.include_business() |> Repo.get(id)

  defp recover_or_insert_application(_page, slug, attrs, %{id: nil} = request), do: insert_application(slug, attrs, request)

  defp recover_or_insert_application(page, slug, attrs, request) do
    existing =
      Prospect.for_business(page.business_id)
      |> where([prospect], prospect.landing_page_id == ^page.id and prospect.application_request_id == ^request.id)
      |> Repo.one()

    case existing do
      nil ->
        insert_application(slug, attrs, request)

      %{application_fingerprint: fingerprint} = prospect when fingerprint == request.fingerprint ->
        {:ok, %{prospect: prospect, business: page.business, program: nil}}

      _ ->
        {:error, :conflict}
    end
  end

  defp insert_application(slug, attrs, request) do
    with {:ok, %{page: page, business: business}} <- preview_landing_page(slug),
         :ok <- application_identity(page, request.page_id),
         :ok <- check_revision(page, attrs),
         {:ok, program} <- LandingPage.application_program(page, attrs),
         {:ok, prospect} <- application_changeset(page, program, attrs, request) |> Repo.insert() do
      {:ok, %{prospect: prospect, business: business, program: program}}
    end
  end

  defp application_identity(_page, nil), do: :ok
  defp application_identity(%LandingPage{id: id}, id), do: :ok
  defp application_identity(_page, _id), do: {:error, :not_found}

  defp application_changeset(page, program, attrs, request) do
    page.business_id
    |> Prospect.application_changeset(page.id, program && program.id, attrs)
    |> Ecto.Changeset.put_change(:application_request_id, request.id)
    |> Ecto.Changeset.put_change(:application_fingerprint, request.fingerprint)
    |> LandingApplicationQuestions.validate_answers(page.application_questions)
    |> Ecto.Changeset.put_change(:submitted_questions, page.application_questions)
    |> Ecto.Changeset.put_change(:submitted_program, program && %{"id" => program.id, "name" => program.name})
  end
end
