defmodule Easy.Organizations.Coach do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Clients.CoachClientAssignment

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coaches" do
    field :bio, :string
    field :specialties, {:array, :string}
    field :credentials, :map
    field :status, :string, default: "active"

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business

    many_to_many :clients, Easy.Clients.Client, join_through: CoachClientAssignment

    timestamps()
  end

  @valid_statuses ~w(active inactive suspended)

  def changeset(coach, attrs) do
    coach
    |> cast(attrs, [:bio, :specialties, :credentials, :status])
    |> validate_status()
    |> validate_credentials()
  end

  def create_changeset(coach, attrs) do
    coach
    |> cast(attrs, [:user_id, :business_id, :bio, :specialties, :credentials, :status])
    |> validate_required([:user_id, :business_id])
    |> validate_status()
    |> validate_credentials()
    |> ensure_status()
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:business_id)
    |> unique_constraint([:user_id, :business_id],
      name: :coaches_user_id_business_id_index,
      message: "already has a coach profile for this business"
    )
  end

  defp ensure_status(changeset) do
    case get_field(changeset, :status) do
      nil -> put_change(changeset, :status, "active")
      _ -> changeset
    end
  end

  def update_changeset(coach, attrs) do
    coach
    |> cast(attrs, [:bio, :specialties, :credentials, :status])
    |> validate_status()
    |> validate_credentials()
  end

  # Private validation helpers

  defp validate_status(changeset) do
    changeset
    |> validate_inclusion(:status, @valid_statuses,
      message: "must be one of: #{Enum.join(@valid_statuses, ", ")}"
    )
  end

  defp validate_credentials(changeset) do
    case get_change(changeset, :credentials) do
      nil ->
        changeset

      credentials when is_map(credentials) ->
        changeset

      _ ->
        add_error(changeset, :credentials, "must be a valid map")
    end
  end

  @doc """
  Returns true if the coach is active.
  """
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false
end
