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
    field :image_url, :string
    field :status, :string, default: "pending"
    field :invitation_token, :string
    field :invitation_expires_at, :utc_datetime
    field :join_source, :string, default: "email_invite"
    field :height_cm, :integer
    field :weight_kg, :integer
    field :date_of_birth, :date
    field :sex, :string
    field :gender_identity, :string
    field :activity_level, :string
    field :goal, :string
    field :dietary_notes, :string
    field :injury_notes, :string
    field :medication_notes, :string
    field :measurement_system, :string

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business

    many_to_many :coaches, Easy.Organizations.Coach, join_through: CoachClientAssignment

    timestamps()
  end

  @valid_statuses ~w(pending active inactive archived)
  @valid_join_sources ~w(email_invite public_link manual)
  @valid_sex ~w(male female intersex prefer_not_to_say)
  @valid_activity_levels ~w(sedentary light moderate active athlete)
  @valid_goals ~w(lose_weight maintain gain_muscle improve_endurance rehab)
  @valid_measurement_systems ~w(metric imperial)

  # ===========================================================================
  # Changesets
  # ===========================================================================

  @doc """
  Generic changeset for updating a client (used by coaches).
  Allows updating all editable fields.
  """
  def changeset(client, attrs) do
    client
    |> cast(attrs, [
      :email,
      :full_name,
      :phone,
      :notes,
      :image_url,
      :status,
      :height_cm,
      :weight_kg,
      :date_of_birth,
      :sex,
      :gender_identity,
      :activity_level,
      :goal,
      :dietary_notes,
      :injury_notes,
      :medication_notes,
      :measurement_system
    ])
    |> validate_required([:email, :full_name])
    |> validate_email()
    |> validate_phone()
    |> validate_image_url()
    |> validate_status()
    |> validate_health_fields()
  end

  def create_changeset(client, attrs, join_source \\ "email_invite") do
    token = generate_invitation_token()

    expires_at =
      DateTime.add(DateTime.utc_now(), 7 * 24 * 60 * 60, :second) |> DateTime.truncate(:second)

    client
    |> cast(attrs, [
      :email,
      :full_name,
      :phone,
      :notes,
      :image_url,
      :business_id,
      :height_cm,
      :weight_kg,
      :date_of_birth,
      :sex,
      :gender_identity,
      :activity_level,
      :goal,
      :dietary_notes,
      :injury_notes,
      :medication_notes,
      :measurement_system
    ])
    |> validate_required([:email, :full_name, :business_id])
    |> validate_email()
    |> validate_phone()
    |> validate_image_url()
    |> put_change(:status, "pending")
    |> put_change(:invitation_token, token)
    |> put_change(:invitation_expires_at, expires_at)
    |> put_change(:join_source, join_source)
    |> validate_join_source()
    |> validate_health_fields()
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
    |> cast(attrs, [
      :full_name,
      :phone,
      :notes,
      :image_url,
      :status,
      :height_cm,
      :weight_kg,
      :date_of_birth,
      :sex,
      :gender_identity,
      :activity_level,
      :goal,
      :dietary_notes,
      :injury_notes,
      :medication_notes,
      :measurement_system
    ])
    |> validate_phone()
    |> validate_image_url()
    |> validate_status()
    |> validate_health_fields()
  end

  @doc """
  Changeset for client updating their own profile.
  Restricted to profile fields only - no notes or status.
  """
  def profile_changeset(client, attrs) do
    client
    |> cast(attrs, [
      :full_name,
      :phone,
      :image_url,
      :height_cm,
      :weight_kg,
      :date_of_birth,
      :sex,
      :gender_identity,
      :activity_level,
      :goal,
      :dietary_notes,
      :injury_notes,
      :medication_notes,
      :measurement_system
    ])
    |> validate_phone()
    |> validate_image_url()
    |> validate_health_fields()
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
        validate_format(changeset, :phone, ~r/^\\+?[1-9]\\d{1,14}$/,
          message: "must be a valid international phone number"
        )
    end
  end

  defp validate_image_url(changeset) do
    case get_field(changeset, :image_url) do
      nil ->
        changeset

      _url ->
        changeset
        |> validate_length(:image_url, max: 2048)
        |> validate_format(:image_url, ~r/^https?:\/\//,
          message: "must be a valid URL (http or https)"
        )
    end
  end

  defp validate_status(changeset) do
    changeset
    |> validate_inclusion(:status, @valid_statuses,
      message: "must be one of: #{Enum.join(@valid_statuses, ", ")}"
    )
  end

  defp validate_join_source(changeset) do
    changeset
    |> validate_inclusion(:join_source, @valid_join_sources,
      message: "must be one of: #{Enum.join(@valid_join_sources, ", ")}"
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

  @doc """
  Changeset for creating a client via public join link.
  No invitation token is generated - client signs up directly.
  Status depends on whether approval is required.
  """
  def public_join_changeset(client, attrs, approval_required \\ true) do
    status = if approval_required, do: "pending", else: "active"

    client
    |> cast(attrs, [
      :email,
      :full_name,
      :phone,
      :image_url,
      :business_id,
      :height_cm,
      :weight_kg,
      :date_of_birth,
      :sex,
      :gender_identity,
      :activity_level,
      :goal,
      :dietary_notes,
      :injury_notes,
      :medication_notes,
      :measurement_system
    ])
    |> validate_required([:email, :full_name, :business_id])
    |> validate_email()
    |> validate_phone()
    |> validate_image_url()
    |> put_change(:status, status)
    |> put_change(:join_source, "public_link")
    |> put_change(:invitation_token, nil)
    |> put_change(:invitation_expires_at, nil)
    |> validate_health_fields()
    |> foreign_key_constraint(:business_id)
    |> unique_constraint([:email, :business_id],
      name: :clients_email_business_index,
      message: "already exists in this business"
    )
  end

  defp validate_health_fields(changeset) do
    changeset
    |> validate_number(:height_cm, greater_than: 0)
    |> validate_number(:weight_kg, greater_than: 0)
    |> validate_inclusion(:sex, @valid_sex)
    |> validate_inclusion(:activity_level, @valid_activity_levels)
    |> validate_inclusion(:goal, @valid_goals)
    |> validate_inclusion(:measurement_system, @valid_measurement_systems)
    |> validate_date_of_birth(:date_of_birth)
  end

  defp validate_date_of_birth(changeset, field) do
    case get_change(changeset, field) do
      nil ->
        changeset

      date ->
        today = Date.utc_today()

        cond do
          Date.compare(date, today) == :gt ->
            add_error(changeset, field, "cannot be in the future")

          Date.diff(today, date) > 365 * 130 ->
            add_error(changeset, field, "age must be less than 130 years")

          true ->
            changeset
        end
    end
  end
end
