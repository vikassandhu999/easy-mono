defmodule Easy.Fitness.WeightEntry do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Error
  alias Easy.Orgs
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @units [:kg, :lbs]
  @cast_fields [:date, :value, :unit, :note]

  schema "weight_entries" do
    field :date, :date
    field :value, :decimal
    field :unit, Ecto.Enum, values: @units
    field :note, :string

    belongs_to :client, Client
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(client_id, business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:client_id, client_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:date, :value, :unit])
    |> validate_change(:date, &validate_not_future/2)
    |> validate_number(:value, greater_than: 0, less_than: 1000)
    |> validate_length(:note, max: 500)
    |> unique_constraint([:client_id, :date],
      name: :weight_entries_client_id_date_index,
      message: "already logged for this date"
    )
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:value, :unit, :note])
    |> validate_number(:value, greater_than: 0, less_than: 1000)
    |> validate_length(:note, max: 500)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(e in query, where: e.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(e in query, where: e.client_id == ^client_id)
  end

  @spec on_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def on_date(query \\ __MODULE__, date) do
    from(e in query, where: e.date == ^date)
  end

  @spec since(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def since(query \\ __MODULE__, date) do
    from(e in query, where: e.date >= ^date)
  end

  @spec between(Ecto.Queryable.t(), Date.t(), Date.t()) :: Ecto.Query.t()
  def between(query \\ __MODULE__, from_date, to_date) do
    from(e in query, where: e.date >= ^from_date and e.date <= ^to_date)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.date])
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(e in query, order_by: [desc: e.date])
  end

  # Parsing — domain validation for query params, used by callers that compose
  # their own queries.

  @spec parse_since(String.t() | Date.t() | nil) ::
          {:ok, Date.t() | nil} | {:error, Error.t()}
  def parse_since(nil), do: {:ok, nil}
  def parse_since(""), do: {:ok, nil}
  def parse_since(value), do: parse_date(value, :since)

  # Actions

  @spec adherence(String.t(), String.t(), pos_integer()) ::
          {:ok, %{logged_days: non_neg_integer(), window_days: pos_integer()}}
  def adherence(business_id, client_id, window_days \\ 30) do
    start_date = Date.add(Date.utc_today(), 1 - window_days)

    logged_days =
      __MODULE__
      |> for_business(business_id)
      |> for_client(client_id)
      |> since(start_date)
      |> distinct(:date)
      |> Repo.aggregate(:count, :id)

    {:ok, %{logged_days: logged_days, window_days: window_days}}
  end

  @spec upsert(String.t(), String.t(), map()) ::
          {:ok, t()} | {:error, Ecto.Changeset.t() | Error.t()}
  def upsert(client_id, business_id, attrs) do
    with {:ok, date} <- parse_date(date_value(attrs), :date),
         :ok <- ensure_not_future(date) do
      case existing_entry(business_id, client_id, date) do
        nil -> insert_entry(client_id, business_id, date, attrs)
        existing -> update_changeset(existing, normalize_attrs(attrs)) |> Repo.update()
      end
    end
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(entry), do: Repo.delete(entry)

  # Private

  defp existing_entry(business_id, client_id, date) do
    __MODULE__
    |> for_business(business_id)
    |> for_client(client_id)
    |> on_date(date)
    |> Repo.one()
  end

  defp insert_entry(client_id, business_id, date, attrs) do
    case insert_changeset(client_id, business_id, insert_attrs(attrs, date)) |> Repo.insert() do
      {:ok, entry} ->
        {:ok, entry}

      {:error, %{errors: errors} = changeset} ->
        if has_unique_violation?(errors) do
          case existing_entry(business_id, client_id, date) do
            nil -> {:error, changeset}
            existing -> update_changeset(existing, normalize_attrs(attrs)) |> Repo.update()
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

  defp validate_not_future(field, %Date{} = date) do
    if future?(date), do: [{field, "cannot be in the future"}], else: []
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
