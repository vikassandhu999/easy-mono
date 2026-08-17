defmodule Easy.WorkbenchProgrammingQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Plan
  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  @services [:all, :training, :nutrition]

  @spec counts(Ctx.t()) :: %{all: non_neg_integer(), training: non_neg_integer(), nutrition: non_neg_integer()}
  def counts(%Ctx{} = ctx) do
    facts = service_facts(ctx, Date.utc_today())

    from(fact in subquery(facts),
      select: %{
        all: count(fact.client_id, :distinct),
        training:
          fragment(
            "count(DISTINCT ?) FILTER (WHERE ? = 'training')",
            fact.client_id,
            fact.service
          ),
        nutrition:
          fragment(
            "count(DISTINCT ?) FILTER (WHERE ? = 'nutrition')",
            fact.client_id,
            fact.service
          )
      }
    )
    |> Repo.one()
  end

  @spec list(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}} | {:error, :invalid_service}
  def list(%Ctx{} = ctx, opts) do
    with {:ok, service} <- normalize_service(Keyword.get(opts, :service, :all)) do
      facts = ctx |> service_facts(Date.utc_today()) |> for_service(service)
      {offset, limit} = pagination(opts)

      items =
        from(fact in subquery(facts),
          join: client in Client,
          on: client.id == fact.client_id and client.business_id == ^ctx.business_id,
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
          },
          offset: ^offset,
          limit: ^limit
        )
        |> Repo.all()
        |> Enum.map(&to_item/1)

      {:ok, %{count: distinct_client_count(facts), items: items}}
    end
  end

  @spec service_facts(Ctx.t(), Date.t()) :: Ecto.Query.t()
  def service_facts(%Ctx{} = ctx, today) do
    status = service_status(ctx, today)

    from(service in subquery(status),
      where: not service.has_history or not is_nil(service.first_uncovered_on),
      select: %{
        client_id: service.client_id,
        service: service.service,
        service_rank: service.service_rank,
        code:
          fragment(
            "CASE WHEN NOT ? THEN 'service_never_programmed' WHEN ? = ? THEN 'service_coverage_missing' ELSE 'service_coverage_ending_soon' END",
            service.has_history,
            service.first_uncovered_on,
            ^today
          ),
        priority:
          fragment(
            "CASE WHEN NOT ? THEN 0 WHEN ? = ? THEN 1 ELSE 2 END",
            service.has_history,
            service.first_uncovered_on,
            ^today
          ),
        first_uncovered_on: service.first_uncovered_on,
        coverage_ends_on:
          fragment(
            "CASE WHEN ? > ? THEN ? - 1 ELSE NULL END",
            service.first_uncovered_on,
            ^today,
            service.first_uncovered_on
          )
      }
    )
  end

  defp service_status(%Ctx{} = ctx, today) do
    required = required_service_clients(ctx)
    history = assigned_plan_history(ctx.business_id)
    intervals = active_plan_intervals(ctx.business_id)
    horizon = Date.add(today, 7)

    days =
      from(
        day in fragment(
          "SELECT generate_series(?::date, ?::date, interval '1 day')::date AS day",
          ^today,
          ^horizon
        ),
        select: %{day: type(field(day, :day), :date)}
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
          (is_nil(plan.start_date) or plan.start_date <= day.day) and
          (is_nil(plan.end_date) or plan.end_date >= day.day),
      group_by: [
        service.client_id,
        service.service,
        service.service_rank,
        history.client_id
      ],
      select: %{
        client_id: service.client_id,
        service: service.service,
        service_rank: service.service_rank,
        has_history: not is_nil(history.client_id),
        first_uncovered_on: fragment("min(?) FILTER (WHERE ? IS NULL)", day.day, plan.client_id)
      }
    )
  end

  defp required_service_clients(%Ctx{} = ctx) do
    visible =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.for_status(:active)

    training =
      from(client in visible,
        where: fragment("? = ANY(?)", ^"training", client.required_services),
        select: %{
          business_id: client.business_id,
          client_id: client.id,
          service: type(^"training", :string),
          service_rank: 0
        }
      )

    nutrition =
      from(client in visible,
        where: fragment("? = ANY(?)", ^"nutrition", client.required_services),
        select: %{
          business_id: client.business_id,
          client_id: client.id,
          service: type(^"nutrition", :string),
          service_rank: 1
        }
      )

    union_all(training, ^nutrition)
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
    covering_training_plans(business_id)
    |> union_all(^active_nutrition_plans(business_id))
  end

  defp covering_training_plans(business_id) do
    from(plan in TrainingPlan,
      where:
        plan.business_id == ^business_id and plan.kind == :client_plan and is_nil(plan.archived_at) and
          not is_nil(plan.start_date),
      select: %{
        business_id: plan.business_id,
        client_id: plan.client_id,
        service: type(^"training", :string),
        start_date: plan.start_date,
        end_date: plan.end_date
      }
    )
  end

  defp active_nutrition_plans(business_id) do
    from(plan in Plan.covering_intervals(business_id),
      select: %{
        business_id: plan.business_id,
        client_id: plan.client_id,
        service: type(^"nutrition", :string),
        start_date: plan.start_date,
        end_date: plan.end_date
      }
    )
  end

  defp for_service(query, :all), do: query

  defp for_service(query, service) do
    from(fact in query, where: fact.service == ^Atom.to_string(service))
  end

  defp distinct_client_count(query) do
    query
    |> exclude(:select)
    |> select([fact], fact.client_id)
    |> distinct(true)
    |> subquery()
    |> Repo.aggregate(:count)
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

  defp pagination(opts) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)
    {offset, limit}
  end
end
