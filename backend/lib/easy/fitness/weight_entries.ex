defmodule Easy.Fitness.WeightEntries do
  import Ecto.Query

  alias Easy.Clients
  alias Easy.Error
  alias Easy.Fitness.WeightEntry
  alias Easy.Repo

  @spec list_entries_for_user(String.t(), String.t(), String.t() | Date.t() | nil) ::
          {:ok, %{client: Clients.Client.t(), entries: [WeightEntry.t()]}}
          | {:error, :not_found | Error.t()}
  def list_entries_for_user(business_id, user_id, since) do
    with {:ok, client} <- Clients.fetch_client_for_user(business_id, user_id),
         {:ok, since_date} <- WeightEntry.parse_since(since) do
      {:ok, %{client: client, entries: list_entries(business_id, client.id, since_date)}}
    end
  end

  @spec list_entries_for_client(String.t(), String.t(), String.t() | Date.t() | nil) ::
          {:ok, %{client: Clients.Client.t(), entries: [WeightEntry.t()], adherence: map()}}
          | {:error, :not_found | Error.t()}
  def list_entries_for_client(business_id, client_id, since) do
    with {:ok, client} <- Clients.fetch_client(business_id, client_id),
         {:ok, since_date} <- WeightEntry.parse_since(since),
         {:ok, adherence} <- adherence(business_id, client.id) do
      {:ok,
       %{
         client: client,
         entries: list_entries(business_id, client.id, since_date),
         adherence: adherence
       }}
    end
  end

  @spec upsert_for_user(String.t(), String.t(), map()) ::
          {:ok, WeightEntry.t()} | {:error, :not_found | Ecto.Changeset.t() | Error.t()}
  def upsert_for_user(business_id, user_id, attrs) do
    with {:ok, client} <- Clients.fetch_client_for_user(business_id, user_id) do
      upsert(client.id, business_id, attrs)
    end
  end

  @spec delete_for_user(String.t(), String.t(), String.t()) ::
          {:ok, WeightEntry.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_for_user(business_id, user_id, entry_id) do
    with {:ok, client} <- Clients.fetch_client_for_user(business_id, user_id),
         {:ok, entry} <- fetch_entry(business_id, client.id, entry_id) do
      delete_entry(entry)
    end
  end

  @spec adherence(String.t(), String.t(), pos_integer()) ::
          {:ok, %{logged_days: non_neg_integer(), window_days: pos_integer()}}
  def adherence(business_id, client_id, window_days \\ 30) do
    start_date = Date.add(Date.utc_today(), 1 - window_days)

    logged_days =
      WeightEntry
      |> WeightEntry.for_business(business_id)
      |> WeightEntry.for_client(client_id)
      |> WeightEntry.since(start_date)
      |> distinct(:date)
      |> Repo.aggregate(:count, :id)

    {:ok, %{logged_days: logged_days, window_days: window_days}}
  end

  @spec upsert(String.t(), String.t(), map()) ::
          {:ok, WeightEntry.t()} | {:error, Ecto.Changeset.t() | Error.t()}
  def upsert(client_id, business_id, attrs) do
    with {:ok, date} <- parse_date(date_value(attrs), :date),
         :ok <- ensure_not_future(date) do
      case existing_entry(business_id, client_id, date) do
        nil ->
          insert_entry(client_id, business_id, date, attrs)

        existing ->
          WeightEntry.update_changeset(existing, normalize_attrs(attrs)) |> Repo.update()
      end
    end
  end

  @spec delete_entry(WeightEntry.t()) :: {:ok, WeightEntry.t()} | {:error, Ecto.Changeset.t()}
  def delete_entry(entry), do: Repo.delete(entry)

  defp list_entries(business_id, client_id, since_date) do
    WeightEntry
    |> WeightEntry.for_business(business_id)
    |> WeightEntry.for_client(client_id)
    |> maybe_since(since_date)
    |> WeightEntry.ordered()
    |> Repo.all()
  end

  defp maybe_since(query, nil), do: query
  defp maybe_since(query, date), do: WeightEntry.since(query, date)

  defp fetch_entry(business_id, client_id, id) do
    case WeightEntry
         |> WeightEntry.for_business(business_id)
         |> WeightEntry.for_client(client_id)
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      entry -> {:ok, entry}
    end
  end

  defp existing_entry(business_id, client_id, date) do
    WeightEntry
    |> WeightEntry.for_business(business_id)
    |> WeightEntry.for_client(client_id)
    |> WeightEntry.on_date(date)
    |> Repo.one()
  end

  defp insert_entry(client_id, business_id, date, attrs) do
    case WeightEntry.insert_changeset(client_id, business_id, insert_attrs(attrs, date))
         |> Repo.insert() do
      {:ok, entry} ->
        {:ok, entry}

      {:error, %{errors: errors} = changeset} ->
        if has_unique_violation?(errors) do
          case existing_entry(business_id, client_id, date) do
            nil ->
              {:error, changeset}

            existing ->
              WeightEntry.update_changeset(existing, normalize_attrs(attrs)) |> Repo.update()
          end
        else
          {:error, changeset}
        end
    end
  end

  defp insert_attrs(attrs, date) do
    attrs
    |> normalize_attrs()
    |> Map.put(:date, date)
  end

  defp normalize_attrs(attrs) do
    %{}
    |> maybe_put(:value, Map.get(attrs, :value) || Map.get(attrs, "value"))
    |> maybe_put(:unit, Map.get(attrs, :unit) || Map.get(attrs, "unit"))
    |> maybe_put(:note, Map.get(attrs, :note) || Map.get(attrs, "note"))
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp date_value(attrs), do: Map.get(attrs, :date) || Map.get(attrs, "date")

  defp parse_date(nil, field), do: {:error, invalid_date_error(field, "can't be blank")}
  defp parse_date("", field), do: {:error, invalid_date_error(field, "can't be blank")}

  defp parse_date(value, field) do
    case Ecto.Type.cast(:date, value) do
      {:ok, %Date{} = date} -> {:ok, date}
      _ -> {:error, invalid_date_error(field, "is invalid")}
    end
  end

  defp ensure_not_future(%Date{} = date) do
    if future?(date),
      do: {:error, invalid_date_error(:date, "cannot be in the future")},
      else: :ok
  end

  defp future?(%Date{} = date) do
    Date.compare(date, Date.add(Date.utc_today(), 1)) == :gt
  end

  defp invalid_date_error(field, message) do
    Error.unprocessable(%{fields: %{field => [message]}})
  end

  defp has_unique_violation?(errors) do
    Enum.any?(errors, fn {_field, {_message, meta}} ->
      Keyword.get(meta, :constraint) == :unique
    end)
  end
end
