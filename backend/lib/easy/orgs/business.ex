defmodule Easy.Orgs.Business do
  use Ecto.Schema
  alias Easy.Identity.User

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "businesses" do
    field :name, :string
    field :handle, :string
    field :about, :string

    belongs_to :owner, User

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(map(), User.t()) :: Ecto.Changeset.t()
  def insert_changeset(attrs, user) do
    %__MODULE__{}
    |> cast(attrs, [:name, :handle, :about])
    |> validate_required([:name, :handle])
    |> unique_constraint(:handle)
    |> put_assoc(:owner, user)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :about])
  end
end
