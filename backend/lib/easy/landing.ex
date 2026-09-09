defmodule Easy.Landing do
  # Coach landing funnel: a published landing page, sales Programs, public applications,
  # and the Prospects they create. Tenant scope always comes from %Ctx{} or the resolved
  # page — never from request bodies.

  import Ecto.Query

  alias Easy.Ctx
  alias Easy.Landing.{LandingPage, LandingProgram, Prospect}
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Result

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

  # Upsert: page fields + Programs + questions in one request. Programs are replaced wholesale
  # (≤3 rows — a delete+reinsert is simpler than diffing and the page owns their order).
  @spec upsert_landing_page(Ctx.t(), map()) ::
          {:ok, LandingPage.t()} | {:error, :too_many_programs | Ecto.Changeset.t()}
  def upsert_landing_page(%Ctx{} = ctx, attrs) do
    with {:ok, programs} <- LandingPage.program_inputs(attrs) do
      Repo.transact(fn -> do_upsert(ctx, attrs, programs) end)
    end
  end

  defp do_upsert(ctx, attrs, programs) do
    with {:ok, page} <- insert_or_update_page(ctx, attrs),
         {:ok, _programs} <- replace_programs(ctx.business_id, page.id, programs) do
      {:ok, Repo.preload(page, :programs, force: true)}
    end
  end

  defp insert_or_update_page(ctx, attrs) do
    case Repo.one(page_query(ctx)) do
      nil -> ctx.business_id |> LandingPage.insert_changeset(attrs) |> Repo.insert()
      page -> page |> LandingPage.update_changeset(attrs) |> Repo.update()
    end
  end

  defp page_query(%Ctx{} = ctx) do
    LandingPage
    |> LandingPage.for_business(ctx.business_id)
    |> LandingPage.oldest()
    |> limit(1)
  end

  defp replace_programs(business_id, page_id, programs) do
    LandingProgram
    |> LandingProgram.for_business(business_id)
    |> LandingProgram.for_landing_page(page_id)
    |> Repo.delete_all()

    programs
    |> Enum.with_index()
    |> Result.traverse(fn {attrs, index} ->
      business_id |> LandingProgram.insert_changeset(page_id, index, attrs) |> Repo.insert()
    end)
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

  # Unknown program IDs fall back to a general application.
  @spec submit_application(String.t(), map()) ::
          {:ok, %{prospect: Prospect.t(), business: Business.t(), program: LandingProgram.t() | nil}}
          | {:error, :not_found | Ecto.Changeset.t()}
  def submit_application(slug, attrs) do
    with {:ok, %{page: page, business: business}} <- preview_landing_page(slug),
         program = LandingPage.application_program(page, attrs),
         {:ok, prospect} <-
           business.id
           |> Prospect.application_changeset(page.id, program && program.id, attrs)
           |> Repo.insert() do
      {:ok, %{prospect: prospect, business: business, program: program}}
    end
  end
end
