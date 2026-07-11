defmodule Easy.WeightEntries do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Fitness.WeightEntry
  alias Easy.Repo

  # ---------------------------------------------------------------------------
  # Case-3: Client self (target resolved via get_client/1 from ctx.user_id)
  # ---------------------------------------------------------------------------

  @spec list_client_weight_entries(Ctx.t(), keyword()) ::
          {:ok, %{client: Client.t(), entries: [WeightEntry.t()]}}
          | {:error, :not_found | :invalid_since}
  def list_client_weight_entries(%Ctx{} = ctx, opts \\ []) do
    since = Keyword.get(opts, :since)

    with {:ok, client} <- get_client(ctx),
         {:ok, since_date} <- parse_since(since) do
      {:ok, %{client: client, entries: list_entries(ctx.business_id, client.id, since_date)}}
    end
  end

  @spec upsert_client_weight_entry(Ctx.t(), map()) ::
          {:ok, WeightEntry.t()}
          | {:error, :not_found | :date_required | :invalid_date | :future_date | Ecto.Changeset.t()}
  def upsert_client_weight_entry(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client(ctx) do
      upsert(ctx.business_id, client.id, attrs)
    end
  end

  @spec delete_client_weight_entry(Ctx.t(), String.t()) ::
          {:ok, WeightEntry.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_client_weight_entry(%Ctx{} = ctx, entry_id) do
    with {:ok, client} <- get_client(ctx),
         {:ok, entry} <- get_entry(ctx.business_id, client.id, entry_id) do
      delete_entry(entry)
    end
  end

  # ---------------------------------------------------------------------------
  # Case-2: Coach for a client (client_id from PATH, 2nd positional arg)
  # ---------------------------------------------------------------------------

  @spec list_entries_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{client: Client.t(), entries: [WeightEntry.t()], adherence: map()}}
          | {:error, :not_found | :invalid_since}
  def list_entries_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    since = Keyword.get(opts, :since)

    with {:ok, client} <- get_client_by_id(ctx, client_id),
         {:ok, since_date} <- parse_since(since),
         {:ok, adh} <- adherence(ctx, client.id) do
      {:ok,
       %{
         client: client,
         entries: list_entries(ctx.business_id, client.id, since_date),
         adherence: adh
       }}
    end
  end

  @spec adherence(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{logged_days: non_neg_integer(), window_days: pos_integer()}}
          | {:error, :not_found}
  def adherence(%Ctx{} = ctx, client_id, opts \\ []) do
    with {:ok, _client} <- get_client_by_id(ctx, client_id) do
      window_days = Keyword.get(opts, :window_days, 30)
      start_date = Date.add(Date.utc_today(), 1 - window_days)

      logged_days =
        WeightEntry
        |> WeightEntry.for_client(ctx.business_id, client_id)
        |> WeightEntry.since(start_date)
        |> distinct(:date)
        |> Repo.aggregate(:count, :id)

      {:ok, %{logged_days: logged_days, window_days: window_days}}
    end
  end

  defp upsert(business_id, client_id, attrs) do
    with {:ok, date} <- parse_date(attrs[:date]),
         :ok <- ensure_not_future(date) do
      case existing_entry(business_id, client_id, date) do
        nil ->
          insert_entry(business_id, client_id, date, attrs)

        existing ->
          WeightEntry.update_changeset(existing, normalize_attrs(attrs)) |> Repo.update()
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Private
  # ---------------------------------------------------------------------------

  # Resolves the client for the authenticated user (Case-3 / client self path).
  defp get_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  # Resolves a client by explicit id, scoped to the business and visible to the
  # acting coach (Case-2 coach path) — both callers (list_entries_for_client and
  # adherence) inherit the trainer-team visibility guard from here.
  defp get_client_by_id(%Ctx{} = ctx, client_id) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp list_entries(business_id, client_id, since_date) do
    WeightEntry
    |> WeightEntry.for_client(business_id, client_id)
    |> maybe_since(since_date)
    |> WeightEntry.oldest()
    |> Repo.all()
  end

  defp maybe_since(query, nil), do: query
  defp maybe_since(query, date), do: WeightEntry.since(query, date)

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
    |> WeightEntry.on_date(date)
    |> Repo.one()
  end

  defp insert_entry(business_id, client_id, date, attrs) do
    case WeightEntry.insert_changeset(business_id, client_id, insert_attrs(attrs, date))
         |> Repo.insert() do
      {:ok, entry} ->
        {:ok, entry}

      {:error, %{errors: errors} = changeset} ->
        if has_unique_violation?(errors) do
          update_concurrent_entry(business_id, client_id, date, attrs, changeset)
        else
          {:error, changeset}
        end
    end
  end

  defp update_concurrent_entry(business_id, client_id, date, attrs, changeset) do
    case existing_entry(business_id, client_id, date) do
      nil -> {:error, changeset}
      existing -> existing |> WeightEntry.update_changeset(normalize_attrs(attrs)) |> Repo.update()
    end
  end

  defp insert_attrs(attrs, date) do
    attrs
    |> normalize_attrs()
    |> Map.put(:date, date)
  end

  defp normalize_attrs(attrs) do
    %{}
    |> maybe_put(:value, attrs[:value])
    |> maybe_put(:unit, attrs[:unit])
    |> maybe_put(:note, attrs[:note])
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp delete_entry(entry), do: Repo.delete(entry)

  defp parse_since(nil), do: {:ok, nil}
  defp parse_since(""), do: {:ok, nil}

  defp parse_since(value) do
    case Ecto.Type.cast(:date, value) do
      {:ok, %Date{} = date} -> {:ok, date}
      _ -> {:error, :invalid_since}
    end
  end

  defp parse_date(nil), do: {:error, :date_required}
  defp parse_date(""), do: {:error, :date_required}

  defp parse_date(value) do
    case Ecto.Type.cast(:date, value) do
      {:ok, %Date{} = date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  defp ensure_not_future(%Date{} = date) do
    if future?(date),
      do: {:error, :future_date},
      else: :ok
  end

  defp future?(%Date{} = date) do
    Date.compare(date, Date.add(Date.utc_today(), 1)) == :gt
  end

  defp has_unique_violation?(errors) do
    Enum.any?(errors, fn {_field, {_message, meta}} ->
      Keyword.get(meta, :constraint) == :unique
    end)
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
