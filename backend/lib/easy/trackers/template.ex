defmodule Easy.Trackers.Template do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "templates" do
    field :domain, Ecto.Enum, values: [:trackers], default: :trackers
    field :name, :string
    field :description, :string
    field :revision, :integer, default: 1
    field :archived_at, :utc_datetime
    belongs_to :business, Easy.Orgs.Business
    belongs_to :creator, Easy.Orgs.Coach, foreign_key: :created_by
    field :content, :map, default: %{}
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :description, :content])
    |> put_change(:business_id, business_id)
    |> put_change(:created_by, coach_id)
    |> validate_required([:name])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:name, :description, :content])
    |> validate_required([:name])
    |> put_change(:revision, row.revision + 1)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(t in query, where: t.business_id == ^business_id)
end
