defmodule Easy.ClientProfiles.ProfileFieldValue do
  use Ecto.Schema

  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @actors ["coach", "client", "system"]

  @type t :: %__MODULE__{}

  schema "profile_field_values" do
    field :value, :map
    field :updated_by_type, :string
    field :updated_by_id, :binary_id
    field :updated_from_submission_id, :binary_id

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :profile_field_definition, ProfileFieldDefinition

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, profile_field_definition_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:value, :updated_by_type, :updated_by_id, :updated_from_submission_id])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:profile_field_definition_id, profile_field_definition_id)
    |> validate_required([
      :business_id,
      :client_id,
      :profile_field_definition_id,
      :value,
      :updated_by_type
    ])
    |> validate_inclusion(:updated_by_type, @actors)
    |> unique_constraint(:profile_field_definition_id,
      name: :profile_field_values_client_id_profile_field_definition_id_index
    )
    |> check_constraint(:updated_by_type, name: :profile_field_values_updated_by_type_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:profile_field_definition_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(value, attrs) do
    value
    |> cast(attrs, [:value, :updated_by_type, :updated_by_id, :updated_from_submission_id])
    |> validate_required([:value, :updated_by_type])
    |> validate_inclusion(:updated_by_type, @actors)
    |> check_constraint(:updated_by_type, name: :profile_field_values_updated_by_type_check)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(v in query, where: v.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(v in query, where: v.client_id == ^client_id)
  end

  @spec for_field(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_field(query \\ __MODULE__, profile_field_definition_id) do
    from(v in query, where: v.profile_field_definition_id == ^profile_field_definition_id)
  end
end
