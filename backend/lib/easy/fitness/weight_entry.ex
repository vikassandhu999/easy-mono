defmodule Easy.Fitness.WeightEntry do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Forms.FormSubmission
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @units [:kg, :lbs]
  @cast_fields [:date, :value, :unit, :note, :form_submission_id]

  schema "weight_entries" do
    field :date, :date
    field :value, :decimal
    field :unit, Ecto.Enum, values: @units
    field :note, :string

    belongs_to :client, Client
    belongs_to :business, Orgs.Business
    belongs_to :form_submission, FormSubmission

    timestamps(type: :utc_datetime)
  end

  # Changesets

  @spec insert_changeset(String.t(), String.t(), Date.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, today, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:client_id, client_id)
    |> put_change(:business_id, business_id)
    |> validate_required([:date])
    |> validate_change(:date, &validate_not_future(&1, &2, today))
    |> validate_measurement()
    |> unique_constraint([:client_id, :date],
      name: :weight_entries_client_id_date_index,
      message: "already logged for this date"
    )
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:form_submission_id,
      name: :weight_entries_submission_client_business_id_fkey
    )
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [:value, :unit, :note])
    |> validate_measurement()
  end

  defp validate_measurement(changeset) do
    changeset
    |> validate_required([:value, :unit])
    |> validate_number(:value, greater_than: 0, less_than: 1000)
    |> validate_length(:note, max: 500)
  end

  # Queries

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(e in query, where: e.business_id == ^business_id and e.client_id == ^client_id)
  end

  @spec on_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def on_date(query \\ __MODULE__, date) do
    from(e in query, where: e.date == ^date)
  end

  @spec self_logged(Ecto.Queryable.t()) :: Ecto.Query.t()
  def self_logged(query \\ __MODULE__), do: from(e in query, where: is_nil(e.form_submission_id))

  @spec for_submission(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_submission(query \\ __MODULE__, submission_id) do
    from(e in query, where: e.form_submission_id == ^submission_id)
  end

  @spec for_since(Ecto.Queryable.t(), Date.t() | nil | String.t()) :: Ecto.Queryable.t()
  def for_since(query \\ __MODULE__, date)
  def for_since(query, nil), do: query
  def for_since(query, ""), do: query
  def for_since(query, %Date{} = date), do: from(e in query, where: e.date >= ^date)

  @spec for_until(Ecto.Queryable.t(), Date.t() | nil) :: Ecto.Query.t()
  def for_until(query, nil), do: query
  def for_until(query, %Date{} = date), do: from(e in query, where: e.date <= ^date)

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.date, asc: e.id])
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(e in query, order_by: [desc: e.date, desc: e.inserted_at, desc: e.id])
  end

  defp validate_not_future(field, %Date{} = date, today) do
    if date_allowed?(date, today), do: [], else: [{field, "cannot be in the future"}]
  end

  @spec date_allowed?(Date.t(), Date.t()) :: boolean()
  def date_allowed?(%Date{} = date, %Date{} = today) do
    Date.compare(date, Date.add(today, 1)) != :gt
  end
end
