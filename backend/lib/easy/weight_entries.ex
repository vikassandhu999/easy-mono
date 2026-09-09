defmodule Easy.WeightEntries do
  import Ecto.Query

  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Fitness.WeightEntry
  alias Easy.FormAnswers
  alias Easy.Forms.FormSubmission
  alias Easy.Orgs
  alias Easy.Repo
  alias Easy.Result
  alias Easy.WeightEntries.History
  alias Easy.WeightEntries.Input

  @adherence_window_days 30

  # ---------------------------------------------------------------------------
  # Case-3: Client self (target from ctx.client_id)
  # ---------------------------------------------------------------------------

  @spec list_client_weight_entries(Ctx.t(), keyword()) ::
          {:ok, History.t()}
          | {:error, :not_found | :invalid_since}
  def list_client_weight_entries(%Ctx{} = ctx, opts \\ []) do
    since = Keyword.get(opts, :since)

    with {:ok, client} <- ClientAccount.get_client_account(ctx),
         {:ok, since_date} <- Input.parse_since(since) do
      {:ok, weight_history(client, since_date)}
    end
  end

  @spec upsert_client_weight_entry(Ctx.t(), map()) ::
          {:ok, WeightEntry.t()}
          | {:error, :not_found | Input.date_error() | Ecto.Changeset.t()}
  def upsert_client_weight_entry(%Ctx{} = ctx, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, input} <- Input.parse(attrs, Date.utc_today()) do
      upsert_and_stamp(ctx, client_id, input.date, input.attrs)
    end
  end

  @spec delete_client_weight_entry(Ctx.t(), String.t()) ::
          {:ok, WeightEntry.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_client_weight_entry(%Ctx{} = ctx, entry_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      delete_locked(ctx.business_id, client_id, entry_id)
    end
  end

  # ---------------------------------------------------------------------------
  # Case-2: Coach for a client (client_id from PATH, 2nd positional arg)
  # ---------------------------------------------------------------------------

  @spec list_entries_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, History.t()}
          | {:error, :not_found | :invalid_since}
  def list_entries_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    since = Keyword.get(opts, :since)

    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, since_date} <- Input.parse_since(since) do
      {:ok, weight_history(client, since_date)}
    end
  end

  @spec record_form_submission(Ctx.t(), Client.t(), FormSubmission.t()) ::
          {:ok, [WeightEntry.t()]} | {:error, :not_found | Ecto.Changeset.t()}
  def record_form_submission(
        %Ctx{business_id: business_id} = ctx,
        %Client{id: client_id, business_id: business_id} = client,
        %FormSubmission{client_id: client_id, business_id: business_id} = submission
      ) do
    Repo.transact(fn -> append_weight_entries(ctx, client, submission) end)
  end

  def record_form_submission(%Ctx{}, %Client{}, %FormSubmission{}), do: {:error, :not_found}

  defp append_weight_entries(ctx, client, submission) do
    case FormAnswers.weight_values(submission.question_snapshot, submission.answers) do
      [] ->
        {:ok, []}

      values ->
        with {:ok, unit} <- weight_unit(ctx, client) do
          insert_submission_weights(ctx.business_id, client.id, submission, unit, values)
        end
    end
  end

  defp insert_submission_weights(business_id, client_id, submission, unit, values) do
    today = Date.utc_today()
    attrs = %{date: DateTime.to_date(submission.submitted_at), unit: unit, form_submission_id: submission.id}

    Result.traverse(values, fn value ->
      business_id
      |> WeightEntry.insert_changeset(client_id, today, Map.put(attrs, :value, value))
      |> Repo.insert()
    end)
  end

  defp weight_unit(ctx, client) do
    latest_unit =
      WeightEntry
      |> WeightEntry.for_client(ctx.business_id, client.id)
      |> WeightEntry.newest()
      |> select([entry], entry.unit)
      |> limit(1)
      |> Repo.one()

    case latest_unit || client.goal_weight_unit do
      nil -> default_weight_unit(ctx)
      unit -> {:ok, unit}
    end
  end

  defp default_weight_unit(ctx) do
    with {:ok, business} <- Orgs.get_business(ctx), do: {:ok, business.default_weight_unit}
  end

  defp delete_locked(business_id, client_id, entry_id) do
    Repo.transact(fn ->
      with {:ok, _client} <- lock_client(business_id, client_id),
           {:ok, entry} <- get_entry(business_id, client_id, entry_id) do
        Repo.delete(entry)
      end
    end)
  end

  defp upsert_and_stamp(%Ctx{business_id: business_id} = ctx, client_id, date, attrs) do
    Repo.transact(fn ->
      occurred_at = DateTime.utc_now(:second)

      with {:ok, _client} <- lock_client(business_id, client_id),
           {:ok, entry} <- upsert(business_id, client_id, date, attrs),
           {:ok, :recorded} <- ClientAccount.record_client_activity(ctx, occurred_at) do
        {:ok, entry}
      end
    end)
  end

  defp upsert(business_id, client_id, date, attrs) do
    case existing_entry(business_id, client_id, date) do
      nil ->
        business_id
        |> WeightEntry.insert_changeset(client_id, Date.utc_today(), Map.put(attrs, "date", date))
        |> Repo.insert()

      existing ->
        WeightEntry.update_changeset(existing, attrs) |> Repo.update()
    end
  end

  defp lock_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> lock("FOR UPDATE")
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp weight_history(client, since_date) do
    entries = list_entries(client.business_id, client.id, since_date)
    adherence = adherence_data(client.business_id, client.id)
    History.build(entries, client, adherence)
  end

  defp list_entries(business_id, client_id, since_date) do
    WeightEntry
    |> WeightEntry.for_client(business_id, client_id)
    |> WeightEntry.for_since(since_date)
    |> WeightEntry.oldest()
    |> Repo.all()
  end

  defp adherence_data(business_id, client_id) do
    start_date = Date.add(Date.utc_today(), 1 - @adherence_window_days)

    logged_days =
      WeightEntry
      |> WeightEntry.for_client(business_id, client_id)
      |> WeightEntry.for_since(start_date)
      |> distinct(:date)
      |> Repo.aggregate(:count, :id)

    %{logged_days: logged_days, window_days: @adherence_window_days}
  end

  defp get_entry(business_id, client_id, id) do
    case WeightEntry
         |> WeightEntry.for_client(business_id, client_id)
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      entry -> {:ok, entry}
    end
  end

  defp existing_entry(business_id, client_id, date) do
    WeightEntry
    |> WeightEntry.for_client(business_id, client_id)
    |> WeightEntry.self_logged()
    |> WeightEntry.on_date(date)
    |> Repo.one()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
