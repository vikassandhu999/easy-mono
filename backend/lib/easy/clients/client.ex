defmodule Easy.Clients.Client do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Accounts.User
  alias Easy.Organizations.Business

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "clients" do
    field :name, :string
    field :email, :string
    field :phone, :string

    field :invitation_token, :string
    field :invitation_email, :string
    field :invitation_phone, :string

    field :notes, :string

    field :membership_status, Ecto.Enum,
      values: [:active, :inactive, :paused, :pending],
      default: :active

    field :membership_start_date, :date
    field :membership_end_date, :date

    field :created_by, :binary_id

    belongs_to :business, Business
    belongs_to :user, User
    # has_many :subscriptions, ClientSubscription

    timestamps(type: :utc_datetime)
  end

  def create_changeset(client, attrs) do
    client
    |> cast(attrs, [
      :business_id,
      :coach_id,
      :name,
      :email,
      :phone,
      :invitation_token,
      :invitation_email,
      :invitation_phone,
      :notes,
      :membership_status,
      :membership_start_date,
      :membership_end_date,
      :created_by,
      :user_id
    ])
    |> validate_required([:business_id, :name])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_contact_method()
    |> validate_email()
    |> validate_phone()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:coach_id)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:business_id, :email],
      name: :clients_business_id_email_index,
      message: "already exists for this business"
    )
    |> unique_constraint([:business_id, :phone],
      name: :clients_business_id_phone_index,
      message: "already exists for this business"
    )
  end

  def update_changeset(client, attrs) do
    client
    |> cast(attrs, [
      :name,
      :email,
      :phone,
      :notes,
      :membership_status,
      :membership_start_date,
      :membership_end_date,
      :coach_id
    ])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_email()
    |> validate_phone()
    |> foreign_key_constraint(:coach_id)
    |> unique_constraint([:business_id, :email],
      name: :clients_business_id_email_index,
      message: "already exists for this business"
    )
    |> unique_constraint([:business_id, :phone],
      name: :clients_business_id_phone_index,
      message: "already exists for this business"
    )
  end

  def link_user_changeset(client, user_id) do
    client
    |> change(user_id: user_id)
    |> change(invitation_token: nil)
    |> foreign_key_constraint(:user_id)
  end

  def membership_changeset(client, attrs) do
    client
    |> cast(attrs, [:membership_status, :membership_start_date, :membership_end_date])
    |> validate_required([:membership_status])
    |> validate_membership_dates()
  end

  defp validate_contact_method(changeset) do
    email = get_field(changeset, :email)
    phone = get_field(changeset, :phone)
    invitation_email = get_field(changeset, :invitation_email)
    invitation_phone = get_field(changeset, :invitation_phone)

    cond do
      email || phone || invitation_email || invitation_phone ->
        changeset

      true ->
        add_error(
          changeset,
          :base,
          "must have at least one contact method (email, phone, or invitation contact)"
        )
    end
  end

  defp validate_email(changeset) do
    case get_field(changeset, :email) do
      nil ->
        changeset

      _email ->
        validate_format(changeset, :email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    end
  end

  defp validate_phone(changeset) do
    case get_field(changeset, :phone) do
      nil ->
        changeset

      _phone ->
        validate_format(changeset, :phone, ~r/^\+?[1-9]\d{1,14}$/,
          message: "must be a valid phone number"
        )
    end
  end

  defp validate_membership_dates(changeset) do
    start_date = get_field(changeset, :membership_start_date)
    end_date = get_field(changeset, :membership_end_date)

    case {start_date, end_date} do
      {nil, _} ->
        changeset

      {_, nil} ->
        changeset

      {start_d, end_d} ->
        if Date.compare(start_d, end_d) == :lt do
          changeset
        else
          add_error(changeset, :membership_end_date, "must be after start date")
        end
    end
  end

  def active?(%__MODULE__{membership_status: :active}), do: true
  def active?(%__MODULE__{}), do: false

  def has_user_account?(%__MODULE__{user_id: nil}), do: false
  def has_user_account?(%__MODULE__{user_id: _}), do: true

  def has_pending_invitation?(%__MODULE__{invitation_token: nil}), do: false
  def has_pending_invitation?(%__MODULE__{invitation_token: _}), do: true
end
