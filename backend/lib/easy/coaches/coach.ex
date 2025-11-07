defmodule Easy.Coaches.Coach do
  @moduledoc """
  Coach schema representing a coach profile within a business.

  Coaches provide coaching services and manage clients within their business context.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coaches" do
    field :bio, :string
    field :specialties, {:array, :string}
    field :credentials, :map
    field :status, :string, default: "active"

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business
    many_to_many :clients, Easy.Clients.Client, join_through: Easy.Clients.CoachClientAssignment

    timestamps()
  end

  @valid_statuses ~w(active inactive suspended)

  @doc """
  Changeset for creating or updating a coach profile.
  Validates required fields, status values, and unique constraint on user_id + business_id.
  """
  def changeset(coach, attrs) do
    coach
    |> cast(attrs, [:bio, :specialties, :credentials, :status])
    |> validate_status()
    |> validate_credentials()
  end

  @doc """
  Changeset for creating a new coach profile.
  Requires user_id and business_id, sets default status to active.
  """
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

  # Ensure status is set to active if not provided
  defp ensure_status(changeset) do
    case get_field(changeset, :status) do
      nil -> put_change(changeset, :status, "active")
      _ -> changeset
    end
  end

  @doc """
  Changeset for updating coach profile details.
  Allows updating bio, specialties, credentials, and status.
  """
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
