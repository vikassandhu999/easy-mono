defmodule Easy.Plans.Reader do
  import Ecto.Query
  alias Easy.{ClientAccess, Ctx, CursorPage, Repo, Utils}
  alias Easy.Clients.Client
  alias Easy.Plans.{Domain, Plan, Template}
  alias Easy.Plans.Revision, as: PlanRevision

  @spec get_template(Ctx.t(), atom(), String.t()) :: {:ok, map()} | {:error, atom()}
  def get_template(%Ctx{} = ctx, domain, id) do
    with :ok <- Ctx.ensure_coach(ctx),
         row when not is_nil(row) <- Repo.get(Template.for_business(ctx.business_id, domain), id) do
      {:ok, present(ctx, row)}
    else
      _ -> {:error, :not_found}
    end
  end

  @spec get_plan(Ctx.t(), atom(), String.t()) :: {:ok, map()} | {:error, atom()}
  def get_plan(%Ctx{} = ctx, domain, id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      case Repo.get(Template.for_business(ctx.business_id, domain), id) do
        nil -> get_coach_plan(ctx, domain, id)
        row -> {:ok, present(ctx, row)}
      end
    end
  end

  defp get_coach_plan(ctx, domain, id) do
    with row when not is_nil(row) <- Repo.get(Plan.for_business(ctx.business_id, domain), id),
         :ok <- ClientAccess.authorize_client_id(ctx, row.client_id) do
      {:ok, present(ctx, row)}
    else
      _ -> {:error, :not_found}
    end
  end

  @spec get_client_plan(Ctx.t(), atom(), String.t()) :: {:ok, map()} | {:error, atom()}
  def get_client_plan(%Ctx{} = ctx, domain, id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         row when not is_nil(row) <-
           Repo.one(from(p in Plan.for_business(ctx.business_id, domain), where: p.client_id == ^client_id and p.id == ^id)) do
      {:ok, present(ctx, row)}
    else
      _ -> {:error, :not_found}
    end
  end

  @spec list_template_page(Ctx.t(), atom(), keyword()) :: {:ok, map()} | {:error, atom()}
  def list_template_page(%Ctx{} = ctx, domain, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx), do: page(ctx, Template.for_business(ctx.business_id, domain), opts)
  end

  @spec list_plan_page_for_client(Ctx.t(), String.t(), atom(), keyword()) :: {:ok, map()} | {:error, atom()}
  def list_plan_page_for_client(%Ctx{} = ctx, client_id, domain, opts \\ []) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      page(ctx, from(p in Plan.for_business(ctx.business_id, domain), where: p.client_id == ^client_id), opts)
    end
  end

  @spec list_client_plan_page(Ctx.t(), atom(), keyword()) :: {:ok, map()} | {:error, atom()}
  def list_client_plan_page(%Ctx{} = ctx, domain, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      page(ctx, from(p in Plan.for_business(ctx.business_id, domain), where: p.client_id == ^client_id), opts)
    end
  end

  defp page(ctx, query, opts) do
    query = filter_archived(query, Keyword.get(opts, :archived))

    query =
      case Keyword.get(opts, :search) do
        s when is_binary(s) and s != "" -> where(query, [p], ilike(p.name, ^Easy.Search.like_pattern(s)))
        _ -> query
      end

    limit = CursorPage.limit(opts)

    with :ok <- validate_cursor_options(opts),
         {:ok, paged} <- CursorPage.query(query, Keyword.get(opts, :cursor) || "start", limit) do
      paged = apply_offset(paged, opts)
      rows = Repo.all(paged) |> Enum.map(&present(ctx, &1))
      {:ok, CursorPage.finish(rows, limit, Repo.aggregate(query, :count))}
    end
  end

  defp validate_cursor_options(opts) do
    if Keyword.get(opts, :cursor), do: CursorPage.validate_options(opts), else: :ok
  end

  defp apply_offset(query, opts) do
    if Keyword.get(opts, :cursor) do
      query
    else
      {position, _} = Utils.pagination_bounds(opts, 1)
      offset(query, ^position)
    end
  end

  defp filter_archived(q, true), do: where(q, [p], not is_nil(p.archived_at))
  defp filter_archived(q, false), do: where(q, [p], is_nil(p.archived_at))
  defp filter_archived(q, _), do: q

  @spec resolve_client_coverage(Ctx.t(), atom(), Date.t() | String.t() | nil) :: {:ok, map() | nil} | {:error, term()}
  def resolve_client_coverage(%Ctx{} = ctx, domain, date) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, date} <- local_date(ctx, date) do
      row =
        Repo.one(
          from(p in Plan.for_business(ctx.business_id, domain),
            where: p.client_id == ^client_id and fragment("plan_covers(?, ?)", p.id, type(^date, :date))
          )
        )

      if row do
        plan = present(ctx, row, date)
        {:ok, Map.merge(%{date: date, plan: plan}, Domain.coverage(domain, plan.content))}
      else
        {:ok, nil}
      end
    end
  end

  @spec current_plan_names_for_clients(Ctx.t(), atom(), %{String.t() => Date.t()}) :: {:ok, map()} | {:error, atom()}
  def current_plan_names_for_clients(%Ctx{} = ctx, domain, dates) do
    with :ok <- ClientAccess.authorize_client_ids(ctx, Map.keys(dates)) do
      names =
        Enum.reduce(dates, %{}, fn {id, date}, acc ->
          row =
            Repo.one(
              from(p in Plan.for_business(ctx.business_id, domain),
                where: p.client_id == ^id and fragment("plan_covers(?, ?)", p.id, type(^date, :date)),
                select: p.name
              )
            )

          Map.put(acc, id, row)
        end)

      {:ok, names}
    end
  end

  @spec present(Ctx.t(), Template.t() | Plan.t(), Date.t() | nil) :: map()
  def present(ctx, row, date \\ nil)

  def present(%Ctx{}, %Template{} = row, _date) do
    row
    |> Map.from_struct()
    |> Map.take([:id, :name, :description, :revision, :archived_at, :inserted_at, :updated_at, :content])
    |> Map.merge(Domain.summary(row.domain, row.content))
    |> Map.merge(%{
      client: nil,
      status: if(row.archived_at, do: :archived, else: :active),
      lifecycle: nil
    })
    |> Map.merge(%{
      kind: :template,
      start_date: nil,
      end_date: nil,
      created_local_date: nil,
      client_id: nil,
      source_template_id: nil,
      current_revision: nil,
      scheduled_revisions: [],
      stopped_on: nil
    })
  end

  def present(%Ctx{} = ctx, %Plan{} = row, date) do
    client = Repo.one(from(c in Client, where: c.id == ^row.client_id and c.business_id == ^ctx.business_id)) |> Repo.preload([:business, :terms])
    date = date || Client.local_date(client, DateTime.utc_now())

    revisions =
      Repo.all(
        from(r in PlanRevision,
          join: p in Plan,
          on: p.id == r.plan_id,
          where: p.business_id == ^ctx.business_id and r.plan_id == ^row.id and r.domain == ^row.domain,
          order_by: [desc_nulls_last: r.effective_on, desc: r.number]
        )
      )

    current = Enum.find(revisions, &(is_nil(&1.effective_on) or Date.compare(&1.effective_on, date) != :gt))
    future = Enum.filter(revisions, &(&1.effective_on && Date.after?(&1.effective_on, date)))

    row
    |> Map.from_struct()
    |> Map.take([
      :id,
      :name,
      :description,
      :revision,
      :archived_at,
      :start_date,
      :end_date,
      :created_local_date,
      :client_id,
      :source_template_id,
      :inserted_at,
      :updated_at
    ])
    |> Map.merge(Domain.summary(row.domain, current.content))
    |> Map.merge(%{
      client: Map.take(client, [:id, :full_name, :preferred_name]),
      status: if(row.archived_at, do: :archived, else: :active),
      lifecycle: lifecycle(row, client, date),
      kind: :client_plan,
      content: current.content,
      current_revision: revision_value(current),
      scheduled_revisions: Enum.map(future, &revision_value/1),
      stopped_on: Easy.PlanCoverage.stopped_on(%{row | client: client}, date)
    })
  end

  defp lifecycle(%{archived_at: at}, _client, _date) when not is_nil(at), do: :archived
  defp lifecycle(%{start_date: nil}, _client, _date), do: :incomplete
  defp lifecycle(row, client, date), do: Easy.PlanCoverage.lifecycle(%{row | client: client}, date)

  @spec revision_value(PlanRevision.t()) :: map()
  def revision_value(row), do: Map.take(row, [:id, :number, :effective_on, :content])

  @spec revision_on(Ctx.t(), atom(), String.t(), Date.t()) :: PlanRevision.t() | nil
  def revision_on(%Ctx{} = ctx, domain, plan_id, date) do
    plan = Repo.get(Plan.for_business(ctx.business_id, domain), plan_id)

    if plan && can_read_plan?(ctx, plan.client_id) do
      Repo.one(
        from(r in PlanRevision,
          where:
            r.domain == ^domain and r.plan_id == ^plan_id and
              (is_nil(r.effective_on) or r.effective_on <= ^date),
          order_by: [desc_nulls_last: r.effective_on, desc: r.number],
          limit: 1
        )
      )
    end
  end

  defp can_read_plan?(%Ctx{client_id: id}, client_id) when not is_nil(id), do: id == client_id
  defp can_read_plan?(ctx, client_id), do: ClientAccess.authorize_client_id(ctx, client_id) == :ok

  @spec local_date(Ctx.t(), Date.t() | String.t() | nil) :: {:ok, Date.t()} | {:error, atom()}
  def local_date(ctx, nil) do
    with {:ok, calendar} <- Easy.ClientAccount.get_client_calendar(ctx), do: {:ok, calendar.local_date}
  end

  def local_date(_ctx, %Date{} = date), do: {:ok, date}

  def local_date(_ctx, value) do
    case Date.from_iso8601(value) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end
end
