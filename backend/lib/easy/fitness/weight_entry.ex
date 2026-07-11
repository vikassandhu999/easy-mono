defmodule Easy.Fitness.WeightEntry do
  use Ecto.Schema

  alias Easy.ClientProfiles.FormSubmission
  alias Easy.Clients.Client
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

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
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
    |> foreign_key_constraint(:form_submission_id,
      name: :weight_entries_submission_client_business_id_fkey
    )
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

  @spec since(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def since(query \\ __MODULE__, date) do
    from(e in query, where: e.date >= ^date)
  end

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__) do
    from(e in query, order_by: [asc: e.date, asc: e.id])
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(e in query, order_by: [desc: e.date, desc: e.inserted_at, desc: e.id])
  end

  defp validate_not_future(field, %Date{} = date) do
    if future?(date), do: [{field, "cannot be in the future"}], else: []
  end

  defp future?(%Date{} = date) do
    Date.compare(date, Date.add(Date.utc_today(), 1)) == :gt
  end
end
