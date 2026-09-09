defmodule Easy.WorkbenchProgrammingQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Plan
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

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
  @type page :: %{count: non_neg_integer(), items: [item()]}
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
          {:ok, page()} | {:error, :invalid_service}
  def list(%Ctx{} = ctx, opts) do
    with {:ok, service} <- normalize_service(Keyword.get(opts, :service, :all)) do
      facts = ctx |> service_facts(DateTime.utc_now()) |> for_service(service)

      items =
        facts
        |> item_query(ctx.business_id)
        |> Easy.Utils.paginate(opts)
        |> Repo.all()
        |> Enum.map(&to_item/1)

      {:ok, %{count: Repo.count_unique(facts, :client_id), items: items}}
    end
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

  @spec service_facts(Ctx.t(), DateTime.t()) :: Ecto.Query.t()
  def service_facts(%Ctx{} = ctx, now) do
    status = service_status(ctx, now)

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

  defp service_status(%Ctx{} = ctx, now) do
    required = required_service_clients(ctx, now)
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

  defp required_service_clients(%Ctx{} = ctx, now) do
    visible =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.for_status(:active)

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

  defp normalize_service(service) when service in @services, do: {:ok, service}
  defp normalize_service("all"), do: {:ok, :all}
  defp normalize_service("training"), do: {:ok, :training}
  defp normalize_service("nutrition"), do: {:ok, :nutrition}
  defp normalize_service(_service), do: {:error, :invalid_service}
end
