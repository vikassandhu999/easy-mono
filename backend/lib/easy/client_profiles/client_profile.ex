defmodule Easy.ClientProfiles.ClientProfile do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @intake_statuses [:assigned, :in_progress, :completed, :dismissed]

  @type t :: %__MODULE__{}

  schema "client_profiles" do
    field :general, :map, default: %{}
    field :nutrition, :map, default: %{}
    field :training, :map, default: %{}
    field :lifestyle, :map, default: %{}
    field :intake_status, Ecto.Enum, values: @intake_statuses, default: :assigned
    field :intake_completed_at, :utc_datetime

    belongs_to :business, Orgs.Business
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs \\ %{}) do
    %__MODULE__{}
    |> cast(attrs, [:general, :nutrition, :training, :lifestyle, :intake_status, :intake_completed_at])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([
      :business_id,
      :client_id,
      :general,
      :nutrition,
      :training,
      :lifestyle,
      :intake_status
    ])
    |> unique_constraint(:client_id, name: :client_profiles_client_id_index)
    |> check_constraint(:intake_status, name: :client_profiles_intake_status_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(profile, attrs) do
    profile
    |> cast(attrs, [:general, :nutrition, :training, :lifestyle, :intake_status, :intake_completed_at])
    |> validate_required([:general, :nutrition, :training, :lifestyle, :intake_status])
    |> check_constraint(:intake_status, name: :client_profiles_intake_status_check)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(p in query, where: p.client_id == ^client_id)
  end
end
