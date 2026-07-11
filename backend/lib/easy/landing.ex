defmodule Easy.Landing do
  # Coach landing funnel: a published landing page, sales Programs, public applications,
  # and the Prospects they create. Tenant scope always comes from %Ctx{} or the resolved
  # page — never from request bodies.

  import Ecto.Query

  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Landing.{LandingPage, LandingProgram, Prospect}
  alias Easy.Orgs.Business
  alias Easy.Repo

  @max_programs 3

  # ── Coach: landing page ────────────────────────────────────────────────────

  # V1 has one page per business, so the coach "landing page" is that single page (or nil).
  @spec get_landing_page(Ctx.t()) :: {:ok, LandingPage.t() | nil}
  def get_landing_page(%Ctx{} = ctx) do
    page =
      LandingPage
      |> LandingPage.for_business(ctx.business_id)
      |> order_by(asc: :inserted_at, asc: :id)
      |> limit(1)
      |> preload(:programs)
      |> Repo.one()

    {:ok, page}
  end

  # Upsert: page fields + Programs + questions in one request. Programs are replaced wholesale
  # (≤3 rows — a delete+reinsert is simpler than diffing and the page owns their order).
  @spec upsert_landing_page(Ctx.t(), map()) ::
          {:ok, LandingPage.t()} | {:error, :too_many_programs | Ecto.Changeset.t()}
  def upsert_landing_page(%Ctx{} = ctx, attrs) do
    programs = Map.get(attrs, :programs, [])

    if length(programs) > @max_programs do
      {:error, :too_many_programs}
    else
      Repo.transaction(fn -> do_upsert!(ctx, attrs, programs) end)
    end
  end

  # Runs inside the transaction; rolls back (with the error reason) on any step failure.
  defp do_upsert!(ctx, attrs, programs) do
    case do_upsert(ctx, attrs, programs) do
      {:ok, page} -> page
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp do_upsert(ctx, attrs, programs) do
    with {:ok, page} <- insert_or_update_page(ctx, attrs),
         :ok <- replace_programs(ctx.business_id, page.id, programs) do
      {:ok, Repo.preload(page, :programs, force: true)}
    end
  end

  defp insert_or_update_page(ctx, attrs) do
    case Repo.one(LandingPage |> LandingPage.for_business(ctx.business_id) |> limit(1)) do
      nil -> ctx.business_id |> LandingPage.insert_changeset(attrs) |> Repo.insert()
      page -> page |> LandingPage.update_changeset(attrs) |> Repo.update()
    end
  end

  defp replace_programs(business_id, page_id, programs) do
    LandingProgram
    |> LandingProgram.for_business(business_id)
    |> LandingProgram.for_landing_page(page_id)
    |> Repo.delete_all()

    programs
    |> Enum.with_index()
    |> Enum.reduce_while(:ok, fn {attrs, index}, :ok ->
      case business_id |> LandingProgram.insert_changeset(page_id, index, attrs) |> Repo.insert() do
        {:ok, _} -> {:cont, :ok}
        {:error, changeset} -> {:halt, {:error, changeset}}
      end
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
      |> preload([:programs, :business])
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
    with {:ok, %{page: page, business: business}} <- preview_landing_page(slug),
         {:ok, program_id} <- resolve_program(page, attrs) do
      case business.id
           |> Prospect.application_changeset(page.id, program_id, attrs)
           |> Repo.insert() do
        {:ok, prospect} ->
          program = Enum.find(page.programs, &(&1.id == program_id))
          {:ok, %{prospect: prospect, business: business, program: program}}

        {:error, changeset} ->
          {:error, changeset}
      end
    end
  end

  # A submitted program must belong to this page; an unknown id is dropped to a general apply.
  defp resolve_program(page, attrs) do
    case Map.get(attrs, :landing_program_id) do
      nil -> {:ok, nil}
      "" -> {:ok, nil}
      id -> {:ok, if(Enum.any?(page.programs, &(&1.id == id)), do: id, else: nil)}
    end
  end

  # ── Coach: prospects ───────────────────────────────────────────────────────

  @spec list_prospects(Ctx.t(), keyword()) ::
          {:ok, %{prospects: [Prospect.t()], count: non_neg_integer(), summary: map()}}
  def list_prospects(%Ctx{} = ctx, opts \\ []) do
    status = Keyword.get(opts, :status)
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

    base = Prospect |> Prospect.for_business(ctx.business_id) |> Prospect.for_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: summary(Prospect |> Prospect.for_business(ctx.business_id)),
       prospects:
         base
         |> Prospect.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> preload([:landing_program, :landing_page, :client])
         |> Repo.all()
     }}
  end

  @spec get_prospect(Ctx.t(), String.t()) :: {:ok, Prospect.t()} | {:error, :not_found}
  def get_prospect(%Ctx{} = ctx, id) do
    Prospect
    |> Prospect.for_business(ctx.business_id)
    |> preload([:landing_program, :landing_page, :client])
    |> Repo.get(id)
    |> ok_or_not_found()
  end

  @spec update_prospect(Ctx.t(), String.t(), map()) ::
          {:ok, Prospect.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_prospect(%Ctx{} = ctx, id, attrs) do
    with {:ok, prospect} <- get_prospect(ctx, id),
         {:ok, _updated} <- prospect |> Prospect.update_changeset(attrs) |> Repo.update() do
      get_prospect(ctx, id)
    end
  end

  # Enroll: reuse the invite flow to create a pending Client, link it, mark the prospect won.
  # Already-enrolled is a no-op that returns the linked Client.
  @spec enroll_prospect(Ctx.t(), String.t(), map()) ::
          {:ok, %{prospect: Prospect.t(), client: Clients.Client.t(), already_enrolled: boolean()}}
          | {:error, :not_found | any()}
  def enroll_prospect(%Ctx{} = ctx, id, attrs) do
    with {:ok, prospect} <- get_prospect(ctx, id) do
      if prospect.client_id,
        do: {:ok, %{prospect: prospect, client: prospect.client, already_enrolled: true}},
        else: invite_and_link(ctx, prospect, attrs)
    end
  end

  defp invite_and_link(ctx, prospect, attrs) do
    with {:ok, client} <- Clients.invite_client(ctx, invite_attrs(prospect, attrs)),
         {:ok, prospect} <- prospect |> Prospect.enroll_changeset(client.id) |> Repo.update() do
      {:ok, %{prospect: %{prospect | client: client}, client: client, already_enrolled: false}}
    end
  end

  # The coach can edit the prefilled fields, so request attrs win; the prospect fills the gaps.
  defp invite_attrs(prospect, attrs) do
    {default_first, default_last} = split_name(prospect.name)

    %{
      first_name: Map.get(attrs, :first_name) || default_first,
      last_name: Map.get(attrs, :last_name) || default_last,
      email: Map.get(attrs, :email) || prospect.email,
      phone: Map.get(attrs, :phone) || prospect.phone
    }
  end

  defp split_name(nil), do: {nil, nil}

  defp split_name(name) do
    case String.split(String.trim(name), ~r/\s+/, parts: 2) do
      [first, last] -> {first, last}
      [first] -> {first, nil}
      _ -> {nil, nil}
    end
  end

  defp summary(query) do
    from(p in query,
      select: %{
        new: count(fragment("CASE WHEN ? = 'new' THEN 1 END", p.status)),
        reviewing: count(fragment("CASE WHEN ? = 'reviewing' THEN 1 END", p.status)),
        won: count(fragment("CASE WHEN ? = 'won' THEN 1 END", p.status)),
        lost: count(fragment("CASE WHEN ? = 'lost' THEN 1 END", p.status))
      }
    )
    |> Repo.one() || %{new: 0, reviewing: 0, won: 0, lost: 0}
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
