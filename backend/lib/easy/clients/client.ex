defmodule Easy.Clients.Client do
  @moduledoc """
  Client schema representing a customer managed by coaches within a business.

  Clients can be in pending status (invited but not registered) or active status
  (registered with a user account).
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "clients" do
    field :email, :string
    field :full_name, :string
    field :phone, :string
    field :notes, :string
    # "pending", "active", "inactive", "archived"
    field :status, :string

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business
    many_to_many :coaches, Easy.Coaches.Coach, join_through: Easy.Clients.CoachClientAssignment

    timestamps()
  end

  @valid_statuses ~w(pending active inactive archived)

  @doc """
  Changeset for creating a client.
  Validates required fields, email format, phone format, and status values.
  """
  def changeset(client, attrs) do
    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :status, :user_id, :business_id])
    |> validate_required([:email, :full_name, :business_id])
    |> validate_email()
    |> validate_phone()
    |> validate_status()
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:business_id)
    |> unique_constraint([:user_id, :business_id],
      name: :clients_user_business_index,
      message: "already has a client profile for this business"
    )
  end

  @doc """
  Changeset for creating a new client invitation.
  Sets status to pending by default.
  """
  def create_changeset(client, attrs) do
    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :business_id])
    |> validate_required([:email, :full_name, :business_id])
    |> validate_email()
    |> validate_phone()
    |> put_change(:status, "pending")
    |> foreign_key_constraint(:business_id)
  end

  @doc """
  Changeset for updating client information.
  Allows updating contact info, notes, and status.
  """
  def update_changeset(client, attrs) do
    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :status])
    |> validate_email()
    |> validate_phone()
    |> validate_status()
  end

  @doc """
  Changeset for linking a client to a user account.
  Used when a client completes registration.
  """
  def link_user_changeset(client, user_id) do
    client
    |> change(user_id: user_id)
    |> change(status: "active")
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Changeset for updating client status.
  """
  def status_changeset(client, status) do
    client
    |> change(status: status)
    |> validate_status()
  end

  # Private validation helpers

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

  @doc """
  Returns true if the client is active.
  """
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false

  @doc """
  Returns true if the client has a linked user account.
  """
  def has_user_account?(%__MODULE__{user_id: nil}), do: false
  def has_user_account?(%__MODULE__{user_id: _}), do: true

  @doc """
  Returns true if the client is in pending status (invited but not registered).
  """
  def pending?(%__MODULE__{status: "pending"}), do: true
  def pending?(%__MODULE__{}), do: false
end
