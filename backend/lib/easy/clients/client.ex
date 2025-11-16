defmodule Easy.Clients.Client do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "clients" do
    field :email, :string
    field :full_name, :string
    field :phone, :string
    field :notes, :string
    field :status, :string

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business

    many_to_many :coaches, Easy.Organizations.Coach,
      join_through: Easy.Clients.CoachClientAssignment

    timestamps()
  end

  @valid_statuses ~w(pending active inactive archived)

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

  def create_changeset(client, attrs) do
    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :business_id])
    |> validate_required([:email, :full_name, :business_id])
    |> validate_email()
    |> validate_phone()
    |> put_change(:status, "pending")
    |> foreign_key_constraint(:business_id)
  end

  def update_changeset(client, attrs) do
    client
    |> cast(attrs, [:email, :full_name, :phone, :notes, :status])
    |> validate_email()
    |> validate_phone()
    |> validate_status()
  end

  def link_user_changeset(client, user_id) do
    client
    |> change(user_id: user_id)
    |> change(status: "active")
    |> foreign_key_constraint(:user_id)
  end

  def status_changeset(client, status) do
    client
    |> change(status: status)
    |> validate_status()
  end

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

  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false

  def has_user_account?(%__MODULE__{user_id: nil}), do: false
  def has_user_account?(%__MODULE__{user_id: _}), do: true

  def pending?(%__MODULE__{status: "pending"}), do: true
  def pending?(%__MODULE__{}), do: false
end
