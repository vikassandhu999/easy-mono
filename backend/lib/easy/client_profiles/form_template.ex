defmodule Easy.ClientProfiles.FormTemplate do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @purposes ["intake", "weekly_check_in", "nutrition_update", "training_update", "custom"]
  @statuses ["active", "archived"]

  @type t :: %__MODULE__{}

  schema "form_templates" do
    field :name, :string
    field :purpose, :string
    field :sections, {:array, :map}, default: []
    field :status, :string, default: "active"

    belongs_to :business, Orgs.Business
    has_many :form_assignments, Easy.ClientProfiles.FormAssignment

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :purpose, :sections, :status])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :name, :purpose, :sections, :status])
    |> validate_inclusion(:purpose, @purposes)
    |> validate_inclusion(:status, @statuses)
    |> check_constraint(:purpose, name: :form_templates_purpose_check)
    |> check_constraint(:status, name: :form_templates_status_check)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(template, attrs) do
    template
    |> cast(attrs, [:name, :purpose, :sections, :status])
    |> validate_required([:name, :purpose, :sections, :status])
    |> validate_inclusion(:purpose, @purposes)
    |> validate_inclusion(:status, @statuses)
    |> check_constraint(:purpose, name: :form_templates_purpose_check)
    |> check_constraint(:status, name: :form_templates_status_check)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(t in query, where: t.business_id == ^business_id)
  end

  @spec for_purpose(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_purpose(query \\ __MODULE__, purpose) do
    from(t in query, where: t.purpose == ^purpose)
  end
end
