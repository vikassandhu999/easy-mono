defmodule Easy.Fitness.WeightEntry do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Error
  alias Easy.Orgs

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

  # Private

  defp parse_date(nil, field), do: {:error, invalid_date_error(field, "can't be blank")}
  defp parse_date("", field), do: {:error, invalid_date_error(field, "can't be blank")}

  defp parse_date(value, field) do
    case Ecto.Type.cast(:date, value) do
      {:ok, %Date{} = date} -> {:ok, date}
      _ -> {:error, invalid_date_error(field, "is invalid")}
    end
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
end
