defmodule Easy.Organizations.Business do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "businesses" do
    field :name, :string
    field :description, :string
    field :handle, :string
    field :status, :string, default: "active"

    # Contact fields
    field :email, :string
    field :phone, :string
    field :website, :string

    # Address fields
    field :address, :string
    field :city, :string
    field :state, :string
    field :country, :string
    field :postal_code, :string

    # Branding & settings
    field :logo_url, :string
    field :timezone, :string, default: "UTC"

    belongs_to :owner, Easy.Accounts.User
    has_many :coaches, Easy.Organizations.Coach
    has_many :clients, Easy.Clients.Client
    has_one :subscription, Easy.Organizations.Subscription
    has_one :settings, Easy.Organizations.BusinessSettings

    timestamps()
  end

  @castable_fields [
    :name,
    :description,
    :handle,
    :status,
    :email,
    :phone,
    :website,
    :address,
    :city,
    :state,
    :country,
    :postal_code,
    :logo_url,
    :timezone
  ]

  def changeset(business, attrs) do
    business
    |> cast(attrs, @castable_fields)
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 255)
    |> validate_inclusion(:status, ["active", "inactive", "suspended"])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> validate_format(:website, ~r/^https?:\/\//, message: "must start with http:// or https://")
  end

  def create_changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :description, :owner_id, :status, :handle | @castable_fields])
    |> validate_required([:name, :owner_id, :handle])
    |> validate_length(:name, min: 1, max: 255)
    |> put_change(:status, "active")
    |> unique_constraint(:handle)
    |> foreign_key_constraint(:owner_id)
  end

  def update_changeset(business, attrs) do
    business
    |> cast(attrs, [
      :name,
      :description,
      :email,
      :phone,
      :website,
      :address,
      :city,
      :state,
      :country,
      :postal_code,
      :logo_url,
      :timezone
    ])
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 255)
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> validate_format(:website, ~r/^https?:\/\//, message: "must start with http:// or https://")
  end

  def validate_handle(changeset) do
    reserved_words =
      ~w(personal org admin support help security team staff official auth tip home dashboard bounties community user payment claims orgs projects jobs leaderboard onboarding pricing developers companies contracts blog docs open hiring sdk api repo go preview tv podcast)

    changeset
    |> validate_format(:handle, ~r/^[a-zA-Z0-9_-]{2,32}$/)
    |> validate_exclusion(:handle, reserved_words, message: "is reserved")
    |> unsafe_validate_unique(:handle, Easy.Repo)
    |> unique_constraint(:handle)
  end
end
