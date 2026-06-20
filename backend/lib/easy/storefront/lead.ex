defmodule Easy.Storefront.Lead do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Storefront.Offer

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @lead_statuses [:new, :contacted, :converted, :rejected]

  schema "leads" do
    field :name, :string
    field :email, :string
    field :phone, :string
    field :instagram_handle, :string
    field :intake_answers, :map, default: %{}
    field :status, Ecto.Enum, values: @lead_statuses, default: :new
    field :notes, :string
    field :source, :string

    belongs_to :business, Easy.Orgs.Business
    belongs_to :offer, Offer
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end
end
