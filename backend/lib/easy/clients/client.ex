defmodule Easy.Clients.Client do
  @moduledoc """
  Client schema representing a client profile within a business.

  Clients are invited by coaches and belong to a specific business. A client
  can have an associated user account once they accept the invitation.

  ## Status Lifecycle
  - `pending` - Initial state after invitation, no user account yet
  - `active` - Has accepted invitation and has an active user account
  - `inactive` - Temporarily disabled by coach
  - `archived` - Soft-deleted, no longer visible in listings

  ## Tenant Isolation
  All client queries must include `business_id` for proper tenant isolation.
  """

  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Clients.CoachClientAssignment

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "clients" do
    field :email, :string
    field :full_name, :string
    field :phone, :string
    field :notes, :string
    field :status, :string, default: "pending"

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business

    many_to_many :coaches, Easy.Organizations.Coach, join_through: CoachClientAssignment

    timestamps()
  end

  @valid_statuses ~w(pending active inactive archived)

  # ===========================================================================
  # Changesets
  # ===========================================================================

  @doc """
  Generic changeset for updating a client (used by coaches).
  Allows updating all editable fields.
  """
  def changeset(client, attrs) do
    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :status])
    |> validate_required([:email, :full_name])
    |> validate_email()
    |> validate_phone()
    |> validate_status()
  end

  @doc """
  Changeset for creating a new client (via invitation).
  Sets initial status to pending and requires business_id.
  """
  def create_changeset(client, attrs) do
    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :business_id])
    |> validate_required([:email, :full_name, :business_id])
    |> validate_email()
    |> validate_phone()
    |> put_change(:status, "pending")
    |> foreign_key_constraint(:business_id)
    |> unique_constraint([:email, :business_id],
      name: :clients_email_business_index,
      message: "already exists in this business"
    )
  end

  @doc """
  Changeset for coach updating a client.
  Allows updating profile info, notes, and status.
  """
  def update_changeset(client, attrs) do
    client
    |> cast(attrs, [:full_name, :phone, :notes, :status])
    |> validate_phone()
    |> validate_status()
  end

  @doc """
  Changeset for client updating their own profile.
  Restricted to profile fields only - no notes or status.
  """
  def profile_changeset(client, attrs) do
    client
    |> cast(attrs, [:full_name, :phone])
    |> validate_phone()
  end

  @doc """
  Links a user account to this client and activates the client.
  Used when a client accepts an invitation.
  """
  def link_user_changeset(client, user_id) do
    client
    |> change()
    |> put_change(:user_id, user_id)
    |> put_change(:status, "active")
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:user_id, :business_id],
      name: :clients_user_business_index,
      message: "already has a client profile for this business"
    )
  end

  @doc """
  Changeset for updating client status (coach action).
  """
  def status_changeset(client, status) do
    client
    |> change()
    |> put_change(:status, status)
    |> validate_status()
  end

  # ===========================================================================
  # Validations
  # ===========================================================================

  defp validate_email(changeset) do
    changeset
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email address")
    |> validate_length(:email, max: 255)
    |> update_change(:email, &String.downcase/1)
  end

  defp validate_phone(changeset) do
    case get_change(changeset, :phone) do
      nil ->
        changeset

      _phone ->
        validate_format(changeset, :phone, ~r/^\+?[1-9]\d{1,14}$/,
          message: "must be a valid international phone number"
        )
    end
  end

  defp validate_status(changeset) do
    changeset
    |> validate_inclusion(:status, @valid_statuses,
      message: "must be one of: #{Enum.join(@valid_statuses, ", ")}"
    )
  end

  # ===========================================================================
  # Query Helpers
  # ===========================================================================

  @doc "Returns true if client status is active"
  @spec active?(t()) :: boolean()
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false

  @doc "Returns true if client has a linked user account"
  @spec has_user_account?(t()) :: boolean()
  def has_user_account?(%__MODULE__{user_id: nil}), do: false
  def has_user_account?(%__MODULE__{user_id: _}), do: true

  @doc "Returns true if client can be updated (not archived)"
  @spec editable?(t()) :: boolean()
  def editable?(%__MODULE__{status: "archived"}), do: false
  def editable?(%__MODULE__{}), do: true

  def pending?(%__MODULE__{status: "pending"}), do: true
  def pending?(%__MODULE__{}), do: false
end
