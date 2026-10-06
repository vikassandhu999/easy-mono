defmodule Easy.Plans.Programming do
  import Ecto.Query
  import Ecto.Changeset
  alias Easy.{ClientAccess, Ctx, PlanOverlap, Repo, Revision}
  alias Easy.Clients.Client
  alias Easy.Plans.{Domain, Plan, Reader, Template}
  alias Easy.Plans.Revision, as: PlanRevision

  @spec create_template(Ctx.t(), atom(), map()) :: {:ok, map()} | {:error, term()}
  def create_template(%Ctx{} = ctx, domain, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, content} <- Domain.validate(ctx, domain, value(attrs, :content) || Domain.empty(domain)),
         {:ok, row} <-
           Template.insert_changeset(ctx.business_id, ctx.coach_id, domain, Map.put(string_keys(attrs), "content", content))
           |> Repo.insert() do
      {:ok, Reader.present(ctx, row)}
    end
  end

  @spec duplicate_template(Ctx.t(), atom(), String.t()) :: {:ok, map()} | {:error, term()}
  def duplicate_template(%Ctx{} = ctx, domain, id) do
    with {:ok, row} <- Reader.get_template(ctx, domain, id) do
      create_template(ctx, domain, %{name: row.name <> " (copy)", description: row.description, content: row.content})
    end
  end

  @spec assign_template_to_client(Ctx.t(), String.t(), atom(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def assign_template_to_client(%Ctx{} = ctx, client_id, domain, template_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         :ok <- ClientAccess.authorize_client_id(ctx, client_id),
         {:ok, _template} <- Reader.get_template(ctx, domain, template_id) do
      Repo.transact(fn -> assign_locked(ctx, client_id, domain, template_id, attrs) end) |> present_result(ctx)
    end
  end

  defp assign_locked(ctx, client_id, domain, template_id, attrs) do
    client = lock_client(ctx, client_id)
    template = Repo.get(Template.for_business(ctx.business_id, domain) |> lock("FOR UPDATE"), template_id)

    with :ok <- editable_template(template),
         :ok <- Revision.check(template, value(attrs, :expected_revision) || :any),
         {:ok, content} <- Domain.validate(ctx, domain, template.content) do
      create_assignment(ctx, client, template, content, attrs)
    end
  end

  defp editable_template(nil), do: {:error, :not_found}
  defp editable_template(row), do: editable(row)

  defp create_assignment(ctx, client, template, content, attrs) do
    today = Client.local_date(client, DateTime.utc_now())

    cs =
      Plan.insert_changeset(
        ctx.business_id,
        ctx.coach_id,
        template.domain,
        Map.merge(%{"name" => template.name, "description" => template.description}, string_keys(attrs))
      )
      |> put_change(:client_id, client.id)
      |> put_change(:source_template_id, template.id)
      |> put_change(:created_local_date, today)
      |> validate_dates(today)
      |> unique_constraint(:client_id, name: :plans_one_unscheduled)
      |> check_constraint(:end_date, name: :plans_check)

    with {:ok, plan} <- Repo.insert(cs),
         :ok <- check_overlap(ctx, plan),
         {:ok, _} <- insert_revision(ctx, plan, 1, nil, content) do
      {:ok, plan}
    end
  end

  @spec update_plan(Ctx.t(), atom(), String.t(), pos_integer(), map()) :: {:ok, map()} | {:error, term()}
  def update_plan(%Ctx{} = ctx, domain, id, expected, attrs) do
    mutate(ctx, domain, id, expected, fn row -> save(ctx, row, attrs) end)
  end

  defp save(ctx, %Template{} = row, attrs) do
    with :ok <- editable(row),
         {:ok, content} <- Domain.validate(ctx, row.domain, value(attrs, :content) || row.content) do
      row |> Template.update_changeset(Map.put(string_keys(attrs), "content", content)) |> Repo.update()
    end
  end

  defp save(ctx, %Plan{} = row, attrs) do
    client = lock_client(ctx, row.client_id)
    today = Client.local_date(client, DateTime.utc_now())
    cs = row |> Plan.update_changeset(attrs) |> validate_dates(today)

    with :ok <- editable(row),
         {:ok, plan} <- Repo.update(cs),
         :ok <- check_overlap(ctx, plan),
         :ok <- publish(ctx, plan, attrs, today) do
      {:ok, plan}
    end
  end

  defp publish(ctx, plan, attrs, today) do
    case value(attrs, :content) do
      nil ->
        :ok

      content ->
        with {:ok, content} <- Domain.validate(ctx, plan.domain, content),
             {:ok, date} <- cast_date(value(attrs, :effective_on) || today),
             true <- Date.compare(date, today) != :lt || {:error, :past_effective_date},
             {:ok, _} <- insert_revision(ctx, plan, next_number(plan), date, content) do
          :ok
        end
    end
  end

  @spec withdraw_revision(Ctx.t(), atom(), String.t(), String.t(), pos_integer()) :: {:ok, map()} | {:error, term()}
  def withdraw_revision(%Ctx{} = ctx, domain, id, revision_id, expected) do
    mutate(ctx, domain, id, expected, fn
      %Plan{} = plan ->
        today = Client.local_date(lock_client(ctx, plan.client_id), DateTime.utc_now())
        row = Repo.one(from(r in PlanRevision, where: r.id == ^revision_id and r.plan_id == ^plan.id))

        with true <- not is_nil(row) || {:error, :not_found},
             true <- (row.effective_on && Date.after?(row.effective_on, today)) || {:error, :conflict},
             {:ok, _} <- Repo.delete(row) do
          plan |> change(revision: plan.revision + 1) |> Repo.update()
        end

      _ ->
        {:error, :not_found}
    end)
  end

  @spec archive_plan(Ctx.t(), atom(), String.t(), pos_integer()) :: {:ok, map()} | {:error, term()}
  def archive_plan(%Ctx{} = ctx, domain, id, expected) do
    mutate(ctx, domain, id, expected, fn row ->
      attrs = [archived_at: DateTime.utc_now(:second), revision: row.revision + 1]
      attrs = archive_dates(ctx, row, attrs)
      row |> change(attrs) |> Repo.update()
    end)
  end

  defp archive_dates(ctx, %Plan{} = plan, attrs) do
    today = Client.local_date(lock_client(ctx, plan.client_id), DateTime.utc_now())

    cond do
      plan.start_date && Date.after?(plan.start_date, today) -> [{:start_date, nil}, {:end_date, nil} | attrs]
      plan.start_date && (is_nil(plan.end_date) or Date.after?(plan.end_date, today)) -> [{:end_date, today} | attrs]
      true -> attrs
    end
  end

  defp archive_dates(_ctx, _row, attrs), do: attrs

  @spec restore_plan(Ctx.t(), atom(), String.t(), pos_integer()) :: {:ok, map()} | {:error, term()}
  def restore_plan(%Ctx{} = ctx, domain, id, expected), do: mutate(ctx, domain, id, expected, &restore(ctx, &1))

  defp restore(ctx, %Plan{} = plan) do
    lock_client(ctx, plan.client_id)

    plan
    |> change(archived_at: nil, revision: plan.revision + 1)
    |> unique_constraint(:client_id, name: :plans_one_unscheduled)
    |> then(&PlanOverlap.validate(ctx, &1))
    |> Repo.update()
  end

  defp restore(_ctx, template),
    do: template |> change(archived_at: nil, revision: template.revision + 1) |> Repo.update()

  @spec delete_plan(Ctx.t(), atom(), String.t(), pos_integer()) :: {:ok, map()} | {:error, term()}
  def delete_plan(%Ctx{} = ctx, domain, id, expected) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.transact(fn -> delete_locked_template(ctx, domain, id, expected) end)
    end
  end

  defp delete_locked_template(ctx, domain, id, expected) do
    row = Repo.get(Template.for_business(ctx.business_id, domain) |> lock("FOR UPDATE"), id)
    with true <- not is_nil(row) || {:error, :forbidden}, :ok <- Revision.check(row, expected), do: Repo.delete(row)
  end

  defp mutate(ctx, domain, id, expected, fun) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.transact(fn -> mutate_locked(ctx, domain, id, expected, fun) end)
      |> present_result(ctx)
    end
  end

  defp mutate_locked(ctx, domain, id, expected, fun) do
    row =
      Repo.get(Template.for_business(ctx.business_id, domain) |> lock("FOR UPDATE"), id) ||
        Repo.get(Plan.for_business(ctx.business_id, domain) |> lock("FOR UPDATE"), id)

    with :ok <- authorize(ctx, row), :ok <- Revision.check(row, expected), do: fun.(row)
  end

  defp authorize(_ctx, nil), do: {:error, :not_found}
  defp authorize(ctx, %Plan{client_id: id}), do: ClientAccess.authorize_client_id(ctx, id)
  defp authorize(_ctx, %Template{}), do: :ok
  defp editable(%{archived_at: nil}), do: :ok
  defp editable(_), do: {:error, :conflict}
  defp present_result({:ok, row}, ctx), do: {:ok, Reader.present(ctx, row)}
  defp present_result(error, _ctx), do: error

  defp lock_client(ctx, id),
    do:
      Repo.one(from(c in Client, where: c.id == ^id and c.business_id == ^ctx.business_id, lock: "FOR UPDATE"))
      |> Repo.preload([:business, :terms])

  defp insert_revision(ctx, plan, number, date, content) do
    %PlanRevision{}
    |> change(
      plan_id: plan.id,
      domain: plan.domain,
      number: number,
      effective_on: date,
      content: content,
      created_by: ctx.coach_id
    )
    |> Repo.insert()
  end

  defp next_number(plan),
    do: (Repo.aggregate(from(r in PlanRevision, where: r.plan_id == ^plan.id), :max, :number) || 0) + 1

  defp validate_dates(cs, today) do
    cs |> validate_start_change(today) |> validate_end_change(today) |> validate_period()
  end

  defp validate_start_change(cs, today) do
    case fetch_change(cs, :start_date) do
      :error ->
        cs

      {:ok, date} ->
        cond do
          cs.data.start_date && Date.compare(cs.data.start_date, today) != :gt ->
            add_error(cs, :start_date, "can change only while in the future")

          cs.data.id && date && Date.before?(date, today) ->
            add_error(cs, :start_date, "must be today or later")

          true ->
            cs
        end
    end
  end

  defp validate_end_change(cs, today) do
    case fetch_change(cs, :end_date) do
      :error ->
        cs

      {:ok, date} ->
        cond do
          cs.data.end_date && Date.before?(cs.data.end_date, today) ->
            add_error(cs, :end_date, "past dates cannot change")

          date && Date.before?(date, today) ->
            add_error(cs, :end_date, "must be today or later")

          true ->
            cs
        end
    end
  end

  defp validate_period(cs) do
    starting = get_field(cs, :start_date)
    ending = get_field(cs, :end_date)

    if ending && (is_nil(starting) or Date.before?(ending, starting)),
      do: add_error(cs, :end_date, "must be on or after start date"),
      else: cs
  end

  defp check_overlap(ctx, plan) do
    cs = PlanOverlap.validate(ctx, change(plan))
    if cs.valid?, do: :ok, else: {:error, :plan_overlap}
  end

  defp cast_date(%Date{} = d), do: {:ok, d}
  defp cast_date(d), do: Date.from_iso8601(d)
  defp value(attrs, key), do: Map.get(string_keys(attrs), to_string(key))
  defp string_keys(attrs), do: Map.new(attrs, fn {k, v} -> {to_string(k), v} end)
end
