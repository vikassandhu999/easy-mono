defmodule Easy.Clients.Client do
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
    field :invitation_token, :string
    field :invitation_expires_at, :utc_datetime

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

  def create_changeset(client, attrs) do
    token = generate_invitation_token()

    expires_at =
      DateTime.add(DateTime.utc_now(), 7 * 24 * 60 * 60, :second) |> DateTime.truncate(:second)

    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :business_id])
    |> validate_required([:email, :full_name, :business_id])
    |> validate_email()
    |> validate_phone()
    |> put_change(:status, "pending")
    |> put_change(:invitation_token, token)
    |> put_change(:invitation_expires_at, expires_at)
    |> foreign_key_constraint(:business_id)
    |> unique_constraint([:email, :business_id],
      name: :clients_email_business_index,
      message: "already exists in this business"
    )
    |> unique_constraint(:invitation_token)
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

  defp generate_invitation_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end

  @spec active?(t()) :: boolean()
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false

  @spec has_user_account?(t()) :: boolean()
  def has_user_account?(%__MODULE__{user_id: nil}), do: false
  def has_user_account?(%__MODULE__{user_id: _}), do: true

  @spec editable?(t()) :: boolean()
  def editable?(%__MODULE__{status: "archived"}), do: false
  def editable?(%__MODULE__{}), do: true

  def pending?(%__MODULE__{status: "pending"}), do: true
  def pending?(%__MODULE__{}), do: false

  def invitation_valid?(%__MODULE__{invitation_token: nil}), do: false
  def invitation_valid?(%__MODULE__{invitation_expires_at: nil}), do: false
  def invitation_valid?(%__MODULE__{status: status}) when status != "pending", do: false

  def invitation_valid?(%__MODULE__{invitation_expires_at: expires_at}) do
    DateTime.compare(expires_at, DateTime.utc_now()) == :gt
  end

  def regenerate_invitation_changeset(client) do
    token = generate_invitation_token()

    expires_at =
      DateTime.add(DateTime.utc_now(), 7 * 24 * 60 * 60, :second) |> DateTime.truncate(:second)

    client
    |> change()
    |> put_change(:invitation_token, token)
    |> put_change(:invitation_expires_at, expires_at)
  end

  def clear_invitation_changeset(client) do
    client
    |> change()
    |> put_change(:invitation_token, nil)
    |> put_change(:invitation_expires_at, nil)
  end
end
