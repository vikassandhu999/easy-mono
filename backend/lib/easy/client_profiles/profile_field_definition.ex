defmodule Easy.ClientProfiles.ProfileFieldDefinition do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sections ["general", "nutrition", "training", "lifestyle"]
  @field_types ["text", "number", "boolean", "date", "select", "multi_select"]
  @filterable_types ["number", "boolean", "date", "select", "multi_select"]

  @type t :: %__MODULE__{}

  schema "profile_field_definitions" do
    field :section, :string
    field :label, :string
    field :key, :string
    field :field_type, :string
    field :options, {:array, :string}, default: []
    field :filterable, :boolean, default: false
    field :archived_at, :utc_datetime

    belongs_to :business, Orgs.Business
    has_many :profile_field_values, Easy.ClientProfiles.ProfileFieldValue

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:section, :label, :key, :field_type, :options, :filterable])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :section, :label, :key, :field_type])
    |> validate_inclusion(:section, @sections)
    |> validate_inclusion(:field_type, @field_types)
    |> validate_filterable_type()
    |> unique_constraint(:key, name: :profile_field_definitions_business_id_key_index)
    |> check_constraint(:section, name: :profile_field_definitions_section_check)
    |> check_constraint(:field_type, name: :profile_field_definitions_field_type_check)
    |> check_constraint(:filterable,
      name: :profile_field_definitions_filterable_field_type_check,
      message: "cannot be filterable"
    )
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(definition, attrs) do
    definition
    |> cast(attrs, [:section, :label, :key, :field_type, :options, :filterable])
    |> validate_required([:section, :label, :key, :field_type])
    |> validate_inclusion(:section, @sections)
    |> validate_inclusion(:field_type, @field_types)
    |> validate_filterable_type()
    |> unique_constraint(:key, name: :profile_field_definitions_business_id_key_index)
    |> check_constraint(:section, name: :profile_field_definitions_section_check)
    |> check_constraint(:field_type, name: :profile_field_definitions_field_type_check)
    |> check_constraint(:filterable,
      name: :profile_field_definitions_filterable_field_type_check,
      message: "cannot be filterable"
    )
  end

  @spec archive_changeset(t()) :: Ecto.Changeset.t()
  def archive_changeset(definition) do
    change(definition, archived_at: DateTime.utc_now(:second))
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(d in query, where: d.business_id == ^business_id)
  end

  @spec for_section(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_section(query \\ __MODULE__, section) do
    from(d in query, where: d.section == ^section)
  end

  defp validate_filterable_type(changeset) do
    type = get_field(changeset, :field_type)
    filterable = get_field(changeset, :filterable)

    if filterable == true and type not in @filterable_types do
      add_error(changeset, :filterable, "cannot be filterable")
    else
      changeset
    end
  end
end
