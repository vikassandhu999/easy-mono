defmodule Easy.WorkbenchProgrammingQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Plan
  alias Easy.Repo
  alias Easy.Training.TrainingPlan
  alias Easy.WorkbenchPage

  @services [:all, :training, :nutrition]

  @type service :: :training | :nutrition
  @type reason ::
          %{code: :service_never_programmed, service: service()}
          | %{code: :service_coverage_missing, service: service(), first_uncovered_on: Date.t()}
          | %{
              code: :service_coverage_ending_soon,
              service: service(),
              first_uncovered_on: Date.t(),
              coverage_ends_on: Date.t()
            }
  @type item :: %{client: Client.t(), reasons: [reason()]}
  @type page :: %{count: non_neg_integer(), items: [item()], next_cursor: String.t() | nil}
  @type counts :: %{all: non_neg_integer(), training: non_neg_integer(), nutrition: non_neg_integer()}

  @spec counts(Ctx.t()) :: counts()
  def counts(%Ctx{} = ctx) do
    facts = service_facts(ctx, DateTime.utc_now())

    from(fact in subquery(facts),
      select: %{
        all: count(fact.client_id, :distinct),
        training: filter(count(fact.client_id, :distinct), fact.service == "training"),
        nutrition: filter(count(fact.client_id, :distinct), fact.service == "nutrition")
      }
    )
    |> Repo.one()
  end

  @spec list(Ctx.t(), keyword()) ::
          {:ok, page()} | {:error, :cursor_incompatible | :invalid_cursor | :invalid_service}
  def list(%Ctx{} = ctx, opts) do
    with {:ok, service} <- normalize_service(Keyword.get(opts, :service, :all)) do
      list_page(ctx, opts, service)
    end
  end

  defp list_page(ctx, opts, service) do
    scope = %{
      "queue" => "programming",
      "search" => Keyword.get(opts, :search, "") || "",
      "service" => Atom.to_string(service)
    }

    with {:ok, mode} <- WorkbenchPage.mode(opts, scope),
         {:ok, position} <- decode_position(mode) do
      facts = ctx |> service_facts(DateTime.utc_now(), opts[:search]) |> for_service(service)
      count = Repo.count_unique(facts, :client_id)
      {:ok, page(mode, facts, ctx.business_id, opts, position, count, scope)}
    end
  end

  defp page(:legacy, facts, business_id, opts, _position, count, _scope) do
    items = facts |> item_query(business_id) |> Easy.Utils.paginate(opts) |> Repo.all() |> Enum.map(&to_item/1)
    %{count: count, items: items, next_cursor: nil}
  end

  defp page({:cursor, _cursor}, facts, business_id, opts, position, count, scope) do
    limit = WorkbenchPage.limit(opts)

    facts
    |> item_query(business_id)
    |> after_position(position)
    |> limit(^(limit + 1))
    |> Repo.all()
    |> WorkbenchPage.finish(limit, count, scope, &position_of/1)
    |> Map.update!(:items, fn items -> Enum.map(items, &to_item/1) end)
  end

  defp item_query(facts, business_id) do
    from(fact in subquery(facts),
      join: client in Client,
      on: client.id == fact.client_id and client.business_id == ^business_id,
      group_by: client.id,
      order_by: [
        asc: min(fact.priority),
        asc_nulls_first:
          fragment(
            "CASE WHEN min(?) = 0 THEN NULL ELSE min(?) END",
            fact.priority,
            fact.first_uncovered_on
          ),
        asc:
          fragment(
            "(array_agg(? ORDER BY ?, ? NULLS FIRST, ?))[1]",
            fact.service_rank,
            fact.priority,
            fact.first_uncovered_on,
            fact.service_rank
          ),
        asc: client.id
      ],
      select: %{
        client: client,
        priority: min(fact.priority),
        first_uncovered_on:
          fragment(
            "CASE WHEN min(?) = 0 THEN NULL ELSE min(?) END",
            fact.priority,
            fact.first_uncovered_on
          ),
        service_rank:
          fragment(
            "(array_agg(? ORDER BY ?, ? NULLS FIRST, ?))[1]",
            fact.service_rank,
            fact.priority,
            fact.first_uncovered_on,
            fact.service_rank
          ),
        codes:
          fragment(
            "array_agg(? ORDER BY ?, ? NULLS FIRST, ?)",
            fact.code,
            fact.priority,
            fact.first_uncovered_on,
            fact.service_rank
          ),
        services:
          fragment(
            "array_agg(? ORDER BY ?, ? NULLS FIRST, ?)",
            fact.service,
            fact.priority,
            fact.first_uncovered_on,
            fact.service_rank
          ),
        first_uncovered_dates:
          fragment(
            "array_agg(? ORDER BY ?, ? NULLS FIRST, ?)",
            fact.first_uncovered_on,
            fact.priority,
            fact.first_uncovered_on,
            fact.service_rank
          ),
        coverage_end_dates:
          fragment(
            "array_agg(? ORDER BY ?, ? NULLS FIRST, ?)",
            fact.coverage_ends_on,
            fact.priority,
            fact.first_uncovered_on,
            fact.service_rank
          )
      }
    )
  end

  @spec service_facts(Ctx.t(), DateTime.t(), String.t() | nil) :: Ecto.Query.t()
  def service_facts(%Ctx{} = ctx, now, search \\ nil) do
    status = service_status(ctx, now, search)

    from(service in subquery(status),
      where: not service.has_history or not is_nil(service.first_uncovered_on),
      select: %{
        client_id: service.client_id,
        today: service.today,
        service: service.service,
        service_rank: service.service_rank,
        code:
          fragment(
            "CASE WHEN NOT ? THEN 'service_never_programmed' WHEN ? = ? THEN 'service_coverage_missing' ELSE 'service_coverage_ending_soon' END",
            service.has_history,
            service.first_uncovered_on,
            service.today
          ),
        priority:
          fragment(
            "CASE WHEN NOT ? THEN 0 WHEN ? = ? THEN 1 ELSE 2 END",
            service.has_history,
            service.first_uncovered_on,
            service.today
          ),
        first_uncovered_on: service.first_uncovered_on,
        coverage_ends_on:
          fragment(
            "CASE WHEN ? > ? THEN ? - 1 ELSE NULL END",
            service.first_uncovered_on,
            service.today,
            service.first_uncovered_on
          )
      }
    )
  end

  defp service_status(%Ctx{} = ctx, now, search) do
    required = required_service_clients(ctx, now, search)
    history = assigned_plan_history(ctx.business_id)
    intervals = active_plan_intervals(ctx.business_id)

    days =
      from(day in fragment("SELECT generate_series(0, 7) AS offset"),
        select: %{offset: field(day, :offset)}
      )

    from(service in subquery(required),
      cross_join: day in subquery(days),
      left_join: history in subquery(history),
      on:
        history.business_id == service.business_id and
          history.client_id == service.client_id and history.service == service.service,
      left_join: plan in subquery(intervals),
      on:
        plan.business_id == service.business_id and
          plan.client_id == service.client_id and plan.service == service.service and
          (is_nil(plan.start_date) or plan.start_date <= fragment("? + ?", service.today, day.offset)) and
          (is_nil(plan.end_date) or plan.end_date >= fragment("? + ?", service.today, day.offset)),
      group_by: [
        service.client_id,
        service.today,
        service.service,
        service.service_rank,
        history.client_id
      ],
      select: %{
        client_id: service.client_id,
        today: service.today,
        service: service.service,
        service_rank: service.service_rank,
        has_history: not is_nil(history.client_id),
        first_uncovered_on: fragment("min(? + ?) FILTER (WHERE ? IS NULL)", service.today, day.offset, plan.client_id)
      }
    )
  end

  defp required_service_clients(%Ctx{} = ctx, now, search) do
    visible =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.for_status(:active)
      |> Client.search(search)

    training = service_clients(visible, now, "training", 0)
    nutrition = service_clients(visible, now, "nutrition", 1)
    union_all(training, ^nutrition)
  end

  defp service_clients(visible, now, service, rank) do
    from(client in visible,
      join: business in Easy.Orgs.Business,
      on: business.id == client.business_id,
      where: fragment("? = ANY(?)", ^service, client.required_services),
      select: %{
        business_id: client.business_id,
        client_id: client.id,
        today:
          type(
            fragment(
              "(?::timestamp AT TIME ZONE 'UTC' AT TIME ZONE COALESCE(NULLIF(?, ''), NULLIF(?, ''), ?))::date",
              type(^now, :utc_datetime),
              client.timezone,
              business.timezone,
              ^Easy.LocalCalendar.default_timezone()
            ),
            :date
          ),
        service: type(^service, :string),
        service_rank: type(^rank, :integer)
      }
    )
  end

  defp assigned_plan_history(business_id) do
    TrainingPlan
    |> assigned_plan_rows(business_id, "training")
    |> union_all(^assigned_plan_rows(Plan, business_id, "nutrition"))
    |> subquery()
    |> then(fn plans ->
      from(plan in plans,
        group_by: [plan.business_id, plan.client_id, plan.service],
        select: %{
          business_id: plan.business_id,
          client_id: plan.client_id,
          service: plan.service
        }
      )
    end)
  end

  defp assigned_plan_rows(schema, business_id, service) do
    from(plan in schema,
      where: plan.business_id == ^business_id and not is_nil(plan.client_id),
      select: %{
        business_id: plan.business_id,
        client_id: plan.client_id,
        service: type(^service, :string)
      }
    )
  end

  defp active_plan_intervals(business_id) do
    training = TrainingPlan.covering_intervals(business_id) |> service_intervals("training")
    nutrition = Plan.covering_intervals(business_id) |> service_intervals("nutrition")
    union_all(training, ^nutrition)
  end

  defp service_intervals(query, service) do
    from(plan in query,
      select: %{
        business_id: plan.business_id,
        client_id: plan.client_id,
        service: type(^service, :string),
        start_date: plan.start_date,
        end_date: plan.end_date
      }
    )
  end

  defp for_service(query, :all), do: query

  defp for_service(query, service) do
    from(fact in query, where: fact.service == ^Atom.to_string(service))
  end

  defp to_item(row) do
    reasons =
      [row.codes, row.services, row.first_uncovered_dates, row.coverage_end_dates]
      |> Enum.zip()
      |> Enum.map(&to_reason/1)

    %{client: row.client, reasons: reasons}
  end

  defp to_reason({"service_never_programmed", service, _first_uncovered_on, _coverage_ends_on}) do
    %{code: :service_never_programmed, service: service_atom(service)}
  end

  defp to_reason({"service_coverage_missing", service, first_uncovered_on, _coverage_ends_on}) do
    %{
      code: :service_coverage_missing,
      service: service_atom(service),
      first_uncovered_on: first_uncovered_on
    }
  end

  defp to_reason({"service_coverage_ending_soon", service, first_uncovered_on, coverage_ends_on}) do
    %{
      code: :service_coverage_ending_soon,
      service: service_atom(service),
      coverage_ends_on: coverage_ends_on,
      first_uncovered_on: first_uncovered_on
    }
  end

  defp service_atom("training"), do: :training
  defp service_atom("nutrition"), do: :nutrition

  defp decode_position(:legacy), do: {:ok, nil}
  defp decode_position({:cursor, nil}), do: {:ok, nil}

  defp decode_position({:cursor, %{"priority" => priority, "first_uncovered_on" => date, "service_rank" => rank, "id" => id}})
       when is_integer(priority) and is_integer(rank) and is_binary(id) do
    with {:ok, id} <- Ecto.UUID.cast(id),
         {:ok, date} <- decode_date(date) do
      {:ok, %{priority: priority, first_uncovered_on: date, service_rank: rank, id: id}}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  defp decode_position(_mode), do: {:error, :invalid_cursor}

  defp decode_date(nil), do: {:ok, nil}
  defp decode_date(date) when is_binary(date), do: Date.from_iso8601(date)
  defp decode_date(_date), do: {:error, :invalid_cursor}

  defp after_position(query, nil), do: query

  defp after_position(query, %{priority: priority, first_uncovered_on: nil, service_rank: service_rank, id: id}) do
    having(
      query,
      [fact, client],
      min(fact.priority) > ^priority or
        (min(fact.priority) == ^priority and
           (fragment(
              "(array_agg(? ORDER BY ?, ? NULLS FIRST, ?))[1]",
              fact.service_rank,
              fact.priority,
              fact.first_uncovered_on,
              fact.service_rank
            ) > ^service_rank or
              (fragment(
                 "(array_agg(? ORDER BY ?, ? NULLS FIRST, ?))[1]",
                 fact.service_rank,
                 fact.priority,
                 fact.first_uncovered_on,
                 fact.service_rank
               ) == ^service_rank and
                 client.id > ^id)))
    )
  end

  defp after_position(query, %{priority: priority, first_uncovered_on: date, service_rank: service_rank, id: id}) do
    having(
      query,
      [fact, client],
      min(fact.priority) > ^priority or
        (min(fact.priority) == ^priority and
           (fragment(
              "CASE WHEN min(?) = 0 THEN NULL ELSE min(?) END",
              fact.priority,
              fact.first_uncovered_on
            ) > ^date or
              (fragment(
                 "CASE WHEN min(?) = 0 THEN NULL ELSE min(?) END",
                 fact.priority,
                 fact.first_uncovered_on
               ) == ^date and
                 (fragment(
                    "(array_agg(? ORDER BY ?, ? NULLS FIRST, ?))[1]",
                    fact.service_rank,
                    fact.priority,
                    fact.first_uncovered_on,
                    fact.service_rank
                  ) > ^service_rank or
                    (fragment(
                       "(array_agg(? ORDER BY ?, ? NULLS FIRST, ?))[1]",
                       fact.service_rank,
                       fact.priority,
                       fact.first_uncovered_on,
                       fact.service_rank
                     ) == ^service_rank and
                       client.id > ^id)))))
    )
  end

  defp position_of(row) do
    %{
      "priority" => row.priority,
      "first_uncovered_on" => if(row.first_uncovered_on, do: Date.to_iso8601(row.first_uncovered_on)),
      "service_rank" => row.service_rank,
      "id" => row.client.id
    }
  end

  defp normalize_service(service) when service in @services, do: {:ok, service}
  defp normalize_service("all"), do: {:ok, :all}
  defp normalize_service("training"), do: {:ok, :training}
  defp normalize_service("nutrition"), do: {:ok, :nutrition}
  defp normalize_service(_service), do: {:error, :invalid_service}
end
