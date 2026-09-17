defmodule Easy.WorkbenchQueryPlanTest do
  use Easy.DataCase, async: false

  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Clients.Client
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormSubmission
  alias Easy.Nutrition.Menu
  alias Easy.Nutrition.Plan
  alias Easy.QueryPlan
  alias Easy.Repo
  alias Easy.Training.TrainingPlan
  alias Easy.Workbench

  @tenant_count 20
  @clients_per_tenant 100

  test "captures and explains SQL emitted by the public queue seam" do
    business = insert(:business)
    insert(:coach, business: business, user: business.owner)
    ctx = owner_ctx(business)

    {result, queries} = QueryPlan.capture(fn -> Workbench.counts(ctx) end)

    assert {:ok, _counts} = result
    assert length(queries) == 6

    plans = QueryPlan.explain(queries)
    summaries = Enum.map(plans, &QueryPlan.summarize/1)

    assert length(plans) == length(queries)
    assert Enum.all?(plans, &is_map/1)
    assert Enum.all?(summaries, &is_binary(&1.top_node))
    assert Enum.all?(summaries, &is_integer(&1.actual_rows))
  end

  test "representative public queue calls use bounded tenant-leading plans" do
    %{owner_ctx: owner_ctx, trainer_ctx: trainer_ctx, row_counts: row_counts} =
      seed_representative_data()

    assert row_counts == %{
             "chat_messages" => 1_000,
             "clients" => 2_000,
             "conversations" => 1_800,
             "form_assignments" => 2_000,
             "form_submissions" => 600,
             "nutrition_plans" => 4_000,
             "training_plans" => 4_000
           }

    Repo.query!("""
    ANALYZE clients, conversations, chat_messages, form_assignments, form_submissions,
      training_plans, nutrition_plans, workbench_queue_snoozes
    """)

    summaries =
      for {name, fun, expected_query_count} <- projections(owner_ctx, trainer_ctx),
          reduce: [] do
        evidence ->
          {result, queries} = QueryPlan.capture(fun)
          assert {:ok, payload} = result
          assert projection_count(payload) > 0
          assert length(queries) == expected_query_count

          query_evidence =
            queries
            |> QueryPlan.explain()
            |> Enum.with_index(1)
            |> Enum.map(fn {plan, position} ->
              plan
              |> QueryPlan.summarize()
              |> Map.merge(%{projection: name, query: position})
            end)

          evidence ++ query_evidence
      end

    used_indexes = summaries |> Enum.flat_map(& &1.indexes) |> MapSet.new()

    expected_indexes =
      MapSet.new([
        "clients_active_subscription_ends_on_index",
        "clients_business_id_assigned_coach_id_index",
        "conversations_waiting_since_index"
      ])

    assert MapSet.subset?(expected_indexes, used_indexes),
           "missing expected indexes: #{inspect(MapSet.difference(expected_indexes, used_indexes))}"

    assert Enum.any?(used_indexes, &String.starts_with?(&1, "training_plans_")),
           "training queue queries should use a tenant-leading training_plans index, got: #{inspect(used_indexes)}"

    assert Enum.any?(used_indexes, &String.starts_with?(&1, "nutrition_plans_")),
           "nutrition queue queries should use a tenant-leading nutrition_plans index, got: #{inspect(used_indexes)}"

    large_relations = Map.keys(row_counts)

    unbounded_scans =
      for summary <- summaries,
          scan <- summary.sequential_scans,
          scan.relation in large_relations,
          scan.actual_rows + scan.rows_removed > @clients_per_tenant * 2 do
        Map.merge(scan, %{projection: summary.projection, query: summary.query})
      end

    assert unbounded_scans == []
  end

  test "unified pages use one snapshot statement with optional counts at representative sizes" do
    assert String.contains?(Repo.config()[:database], "_test")
    fixture = seed_representative_data(1, 1_200)
    sparse_coach = insert(:coach, business: fixture.business)

    sparse_ids =
      Repo.all(
        from(client in Client,
          where: client.business_id == ^fixture.business.id,
          order_by: client.id,
          limit: 12,
          select: client.id
        )
      )

    from(client in Client, where: client.id in ^sparse_ids)
    |> Repo.update_all(set: [assigned_coach_id: sparse_coach.id])

    actors = [
      {:owner, fixture.owner_ctx, fixture.owner_coach},
      {:assigned_coach, fixture.trainer_ctx, fixture.trainer},
      {:sparse_coach, trainer_ctx(sparse_coach), sparse_coach}
    ]

    Repo.query!("""
    ANALYZE clients, conversations, form_assignments, form_submissions,
      training_plans, nutrition_plans, workbench_queue_snoozes
    """)

    evidence =
      for {role, ctx, coach} <- actors,
          view <- ["awaiting", "follow-ups"],
          include_count <- [true, false],
          search <- ["", "absent-client"] do
        opts = [view: view, include_count: include_count, search: search, limit: 25]
        {elapsed, {result, queries}} = :timer.tc(fn -> QueryPlan.capture(fn -> Workbench.list_items(ctx, opts) end) end)
        assert {:ok, page} = result
        assert length(queries) == 1
        assert length(page.items) <= 25
        assert is_integer(page.count) == include_count
        plans = QueryPlan.explain(queries)

        timings =
          for _ <- 1..5 do
            {time, {:ok, _}} = :timer.tc(fn -> Workbench.list_items(ctx, opts) end)
            time / 1_000
          end

        conn = Phoenix.ConnTest.build_conn() |> Easy.ConnCase.authenticate_coach(coach)

        api_timings =
          for _ <- 1..3 do
            {time, response} =
              :timer.tc(fn ->
                Phoenix.ConnTest.dispatch(conn, EasyWeb.Endpoint, :get, "/v1/coach/workbench/items", Map.new(opts))
              end)

            assert Phoenix.ConnTest.json_response(response, 200)["count"] == page.count
            time / 1_000
          end

        later =
          if page.next_cursor do
            {next, later_queries} =
              QueryPlan.capture(fn -> Workbench.list_items(ctx, Keyword.put(opts, :cursor, page.next_cursor)) end)

            assert {:ok, later_page} = next
            assert length(later_queries) == 1
            refute Enum.any?(later_page.items, fn item -> Enum.any?(page.items, &(&1.id == item.id)) end)
            QueryPlan.explain(later_queries)
          else
            []
          end

        %{
          role: role,
          view: view,
          include_count: include_count,
          search: search,
          elapsed_ms: elapsed / 1_000,
          repeated_ms: timings,
          api_ms: api_timings,
          plans: plans,
          later_plans: later,
          sql: Enum.map(queries, & &1.sql),
          summaries: Enum.map(plans, &QueryPlan.summarize/1)
        }
      end

    if report = System.get_env("WORKBENCH_QUERY_REPORT") do
      File.write!(
        report,
        Jason.encode!(
          %{
            database: "isolated test database",
            postgres: Repo.query!("SHOW server_version").rows,
            clients: 1_200,
            row_counts: fixture.row_counts,
            evidence: evidence
          },
          pretty: true
        )
      )
    end
  end

  defp projections(owner_ctx, trainer_ctx) do
    [
      {:owner_items, fn -> Workbench.list_items(owner_ctx) end, 1},
      {:trainer_items, fn -> Workbench.list_items(trainer_ctx) end, 1},
      {:follow_up_items, fn -> Workbench.list_items(trainer_ctx, view: "follow-ups") end, 1},
      {:owner_counts, fn -> Workbench.counts(owner_ctx) end, 6},
      {:trainer_counts, fn -> Workbench.counts(trainer_ctx) end, 6},
      {:onboarding_list, fn -> Workbench.list_onboarding_queue(trainer_ctx, limit: 20) end, 3},
      {:check_ins_list, fn -> Workbench.list_check_in_queue(trainer_ctx, limit: 20) end, 3},
      {:replies_list, fn -> Workbench.list_replies_queue(trainer_ctx, limit: 20) end, 5},
      {:owner_replies_list, fn -> Workbench.list_replies_queue(owner_ctx, limit: 20) end, 5},
      {:programming_list, fn -> Workbench.list_programming_queue(trainer_ctx, limit: 20) end, 3},
      {:owner_programming_list, fn -> Workbench.list_programming_queue(owner_ctx, limit: 20) end, 3},
      {:expiring_list, fn -> Workbench.list_expiring_queue(trainer_ctx, limit: 20) end, 3},
      {:owner_expiring_list, fn -> Workbench.list_expiring_queue(owner_ctx, limit: 20) end, 3},
      {:quiet_list, fn -> Workbench.list_quiet_queue(trainer_ctx, limit: 20) end, 3}
    ]
  end

  defp projection_count(%{all: all}) when is_integer(all), do: all
  defp projection_count(%{count: count}), do: count

  defp projection_count(counts) do
    counts
    |> Map.values()
    |> Enum.map(fn
      value when is_integer(value) -> value
      programming when is_map(programming) -> programming.all
    end)
    |> Enum.sum()
  end

  defp seed_representative_data(tenant_count \\ @tenant_count, clients_per_tenant \\ @clients_per_tenant) do
    seeded_at_usec = DateTime.utc_now(:microsecond)
    seeded_at = DateTime.truncate(seeded_at_usec, :second)
    today = Date.utc_today()

    tenants =
      for _tenant_index <- 1..tenant_count do
        business = insert(:business)
        owner_coach = insert(:coach, business: business, user: business.owner)
        trainer = insert(:coach, business: business)

        %{
          business: business,
          check_in_template: insert(:form_template, business: business, purpose: :check_in),
          intake_template: insert(:form_template, business: business, purpose: :intake),
          owner_coach: owner_coach,
          trainer: trainer
        }
      end

    records =
      for tenant <- tenants,
          client_index <- 0..(clients_per_tenant - 1) do
        representative_record(tenant, client_index, seeded_at, seeded_at_usec, today)
      end

    insert_rows(Client, records, & &1.client)
    insert_rows(Conversation, records, & &1.conversation)
    insert_rows(FormAssignment, records, & &1.check_in_assignment)
    insert_rows(FormAssignment, records, & &1.intake_assignment)
    insert_rows(FormSubmission, records, & &1.submission)
    insert_rows(Message, records, & &1.messages)
    insert_rows(TrainingPlan, records, & &1.training_plans)
    insert_rows(Plan, records, & &1.nutrition_plans)

    target = hd(tenants)

    %{
      business: target.business,
      owner_coach: target.owner_coach,
      trainer: target.trainer,
      owner_ctx: owner_ctx(target.business),
      trainer_ctx: trainer_ctx(target.trainer),
      row_counts: %{
        "chat_messages" => count_rows(records, & &1.messages),
        "clients" => count_rows(records, & &1.client),
        "conversations" => count_rows(records, & &1.conversation),
        "form_assignments" =>
          count_rows(records, & &1.check_in_assignment) +
            count_rows(records, & &1.intake_assignment),
        "form_submissions" => count_rows(records, & &1.submission),
        "nutrition_plans" => count_rows(records, & &1.nutrition_plans),
        "training_plans" => count_rows(records, & &1.training_plans)
      }
    }
  end

  defp representative_record(tenant, client_index, seeded_at, seeded_at_usec, today) do
    client_id = Ecto.UUID.generate()
    facts = representative_facts(client_index)
    assigned_coach = assigned_coach(tenant, client_index)
    conversation_id = id_for(facts.active?)
    check_in_assignment_id = id_for(facts.active?)
    plan_dates = plan_dates(client_index, today)

    %{
      client:
        client_row(
          tenant,
          assigned_coach,
          client_id,
          client_index,
          facts,
          seeded_at,
          seeded_at_usec,
          today
        ),
      check_in_assignment:
        check_in_assignment_row(
          tenant,
          client_id,
          check_in_assignment_id,
          client_index,
          facts.active?,
          seeded_at,
          today
        ),
      conversation:
        conversation_row(
          tenant.business.id,
          client_id,
          conversation_id,
          client_index,
          facts,
          seeded_at,
          seeded_at_usec
        ),
      intake_assignment:
        intake_assignment_row(
          tenant,
          client_id,
          facts.active? and rem(client_index, 10) == 1,
          seeded_at,
          today
        ),
      messages:
        message_rows(
          tenant.business.id,
          client_id,
          conversation_id,
          facts.waiting?,
          seeded_at_usec
        ),
      nutrition_plans:
        plan_rows(
          Plan,
          tenant,
          client_id,
          client_index,
          :nutrition,
          facts.services,
          plan_dates,
          seeded_at
        ),
      submission:
        submission_row(
          tenant.business.id,
          client_id,
          check_in_assignment_id,
          facts.active? and rem(client_index, 3) == 0,
          seeded_at
        ),
      training_plans:
        plan_rows(
          TrainingPlan,
          tenant,
          client_id,
          client_index,
          :training,
          facts.services,
          plan_dates,
          seeded_at
        )
    }
  end

  defp representative_facts(client_index) do
    active? = rem(client_index, 10) != 0

    %{
      active?: active?,
      pending?: not active?,
      services: services_for(active?, client_index),
      waiting?: active? and rem(client_index, 20) == 2
    }
  end

  defp assigned_coach(tenant, client_index) when rem(client_index, 2) == 0,
    do: tenant.trainer

  defp assigned_coach(tenant, _client_index), do: tenant.owner_coach

  defp id_for(true), do: Ecto.UUID.generate()
  defp id_for(false), do: nil

  defp services_for(false, _client_index), do: []
  defp services_for(true, client_index), do: services_for(client_index)

  defp client_row(
         tenant,
         assigned_coach,
         client_id,
         client_index,
         facts,
         seeded_at,
         seeded_at_usec,
         today
       ) do
    %{
      id: client_id,
      assigned_coach_id: assigned_coach.id,
      business_id: tenant.business.id,
      creator_id: tenant.owner_coach.id,
      inserted_at: seeded_at,
      invitation_sent_at: if(facts.pending?, do: DateTime.add(seeded_at, -4, :day)),
      joined_at: if(facts.active?, do: DateTime.add(seeded_at_usec, -30, :day)),
      required_services: facts.services,
      stage: :onboarding,
      status: if(facts.pending?, do: :pending, else: :active),
      subscription_ends_on:
        if(facts.active? and rem(client_index, 3) == 0,
          do: Date.add(today, 7),
          else: Date.add(today, 40)
        ),
      updated_at: seeded_at
    }
  end

  defp check_in_assignment_row(_tenant, _client_id, _id, _index, false, _seeded_at, _today),
    do: nil

  defp check_in_assignment_row(tenant, client_id, id, client_index, true, seeded_at, today) do
    %{
      id: id,
      business_id: tenant.business.id,
      client_id: client_id,
      due_date: Date.add(today, -rem(client_index, 7)),
      form_template_id: tenant.check_in_template.id,
      inserted_at: seeded_at,
      priority: :normal,
      purpose: :check_in,
      status: check_in_status(client_index),
      updated_at: seeded_at
    }
  end

  defp check_in_status(client_index) when rem(client_index, 5) == 0, do: :completed
  defp check_in_status(_client_index), do: :missed

  defp conversation_row(_business_id, _client_id, _id, _index, %{active?: false}, _at, _at_usec),
    do: nil

  defp conversation_row(business_id, client_id, id, client_index, facts, seeded_at, seeded_at_usec) do
    %{
      id: id,
      business_id: business_id,
      client_id: client_id,
      inserted_at: seeded_at,
      last_message_at: seeded_at_usec,
      last_message_role: last_message_role(facts.waiting?),
      updated_at: seeded_at,
      waiting_since: waiting_since(facts.waiting?, client_index, seeded_at_usec)
    }
  end

  defp last_message_role(true), do: :client
  defp last_message_role(false), do: :coach

  defp waiting_since(true, client_index, seeded_at_usec),
    do: DateTime.add(seeded_at_usec, -rem(client_index + 1, 20), :hour)

  defp waiting_since(false, _client_index, _seeded_at_usec), do: nil

  defp intake_assignment_row(_tenant, _client_id, false, _seeded_at, _today), do: nil

  defp intake_assignment_row(tenant, client_id, true, seeded_at, today) do
    %{
      id: Ecto.UUID.generate(),
      business_id: tenant.business.id,
      client_id: client_id,
      due_date: Date.add(today, -2),
      form_template_id: tenant.intake_template.id,
      inserted_at: seeded_at,
      priority: :normal,
      purpose: :intake,
      status: :assigned,
      updated_at: seeded_at
    }
  end

  defp submission_row(_business_id, _client_id, _assignment_id, false, _seeded_at),
    do: nil

  defp submission_row(business_id, client_id, assignment_id, true, seeded_at) do
    %{
      id: Ecto.UUID.generate(),
      answers: %{},
      business_id: business_id,
      client_id: client_id,
      form_assignment_id: assignment_id,
      inserted_at: seeded_at,
      question_snapshot: [],
      submitted_at: seeded_at,
      submitted_by_id: client_id,
      submitted_by_type: :client
    }
  end

  defp services_for(client_index) do
    case rem(client_index, 4) do
      0 -> [:training]
      1 -> [:nutrition]
      2 -> [:training, :nutrition]
      3 -> []
    end
  end

  defp plan_dates(client_index, today) do
    cond do
      rem(client_index, 5) == 0 -> nil
      rem(client_index, 3) == 0 -> {Date.add(today, -30), Date.add(today, -1)}
      true -> {Date.add(today, -30), Date.add(today, 30)}
    end
  end

  defp plan_rows(schema, tenant, client_id, client_index, service, services, dates, seeded_at) do
    case plan_row(schema, tenant, client_id, client_index, service, services, dates, seeded_at) do
      nil -> []
      current -> [current | historical_plan_rows(schema, current, client_index, service)]
    end
  end

  defp plan_row(TrainingPlan, tenant, client_id, client_index, service, services, dates, seeded_at) do
    if service in services and not is_nil(dates) do
      {start_date, end_date} = dates

      %{
        id: Ecto.UUID.generate(),
        kind: :client_plan,
        revision: 1,
        business_id: tenant.business.id,
        client_id: client_id,
        creator_id: tenant.owner_coach.user_id,
        end_date: end_date,
        inserted_at: seeded_at,
        name: "Plan #{client_index} #{service}",
        start_date: start_date,
        updated_at: seeded_at
      }
    end
  end

  defp plan_row(Plan, tenant, client_id, client_index, service, services, dates, seeded_at) do
    if service in services and not is_nil(dates) do
      {start_date, end_date} = dates

      %{
        id: Ecto.UUID.generate(),
        kind: :client_plan,
        revision: 1,
        business_id: tenant.business.id,
        client_id: client_id,
        creator_id: tenant.owner_coach.user_id,
        end_date: end_date,
        inserted_at: seeded_at,
        menu: Menu.empty(),
        name: "Plan #{client_index} #{service}",
        start_date: start_date,
        updated_at: seeded_at
      }
    end
  end

  defp historical_plan_rows(TrainingPlan, current, client_index, service) do
    for history_index <- 1..4 do
      Map.merge(current, %{
        id: Ecto.UUID.generate(),
        archived_at: current.inserted_at,
        end_date: Date.add(current.start_date, -history_index * 31),
        name: "Historical #{client_index} #{service} #{history_index}",
        start_date: Date.add(current.start_date, -(history_index * 31 + 30))
      })
    end
  end

  defp historical_plan_rows(Plan, current, client_index, service) do
    for history_index <- 1..4 do
      Map.merge(current, %{
        id: Ecto.UUID.generate(),
        archived_at: current.inserted_at,
        end_date: Date.add(current.start_date, -history_index * 31),
        name: "Historical #{client_index} #{service} #{history_index}",
        start_date: Date.add(current.start_date, -(history_index * 31 + 30))
      })
    end
  end

  defp message_rows(_business_id, _client_id, _conversation_id, false, _seeded_at_usec), do: []

  defp message_rows(business_id, client_id, conversation_id, true, seeded_at_usec) do
    for offset <- 10..1//-1 do
      inserted_at = DateTime.add(seeded_at_usec, -offset, :hour)

      %{
        id: Ecto.UUID.generate(),
        body: "Representative waiting message",
        business_id: business_id,
        conversation_id: conversation_id,
        inserted_at: inserted_at,
        sender_id: client_id,
        sender_type: :client,
        updated_at: inserted_at
      }
    end
  end

  defp insert_rows(schema, records, mapper) do
    rows = records |> Enum.flat_map(&List.wrap(mapper.(&1))) |> Enum.reject(&is_nil/1)
    {_count, nil} = Repo.insert_all(schema, rows)
  end

  defp count_rows(records, mapper) do
    records |> Enum.flat_map(&List.wrap(mapper.(&1))) |> Enum.count(&(!is_nil(&1)))
  end
end
