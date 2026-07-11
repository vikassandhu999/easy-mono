defmodule Easy.Orgs.Business do
  use Ecto.Schema
  alias Easy.Identity.User

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @dashboard_setup_hidden_reasons [:dismissed, :completed]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "businesses" do
    field :name, :string
    field :handle, :string
    field :about, :string
    field :whatsapp_number, :string
    field :dashboard_setup_hidden_at, :utc_datetime

    field :dashboard_setup_hidden_reason, Ecto.Enum, values: @dashboard_setup_hidden_reasons

    belongs_to :owner, User

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(User.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(user, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :handle, :about])
    |> validate_required([:name, :handle])
    |> unique_constraint(:handle)
    |> put_assoc(:owner, user)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :about, :whatsapp_number, :dashboard_setup_hidden_reason])
    |> check_constraint(:dashboard_setup_hidden_reason,
      name: :businesses_dashboard_setup_hidden_reason_check
    )
    |> check_constraint(:dashboard_setup_hidden_at,
      name: :businesses_dashboard_setup_hidden_state_consistent
    )
  end

  @spec dashboard_setup_hidden_reasons() :: [atom()]
  def dashboard_setup_hidden_reasons, do: @dashboard_setup_hidden_reasons
end
