defmodule Easy.Orgs.Coach do
  use Ecto.Schema

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coaches" do
    field :name, :string
    field :title, :string
    field :bio, :string

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime)
  end

  def update_changeset(coach, attrs) do
    coach
    |> Ecto.Changeset.cast(attrs, [:name, :title, :bio])
  end
end
