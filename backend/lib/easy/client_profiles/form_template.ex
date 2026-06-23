defmodule Easy.ClientProfiles.FormTemplate do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @purposes [:intake, :weekly_check_in, :nutrition_update, :training_update, :custom]
  @statuses [:active, :archived]
  @core_sections ["general", "nutrition", "training", "lifestyle"]

  @type t :: %__MODULE__{}

  schema "form_templates" do
    field :name, :string
    field :purpose, Ecto.Enum, values: @purposes
    field :sections, {:array, :map}, default: []
    field :status, Ecto.Enum, values: @statuses, default: :active

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
    |> validate_sections()
    |> check_constraint(:purpose, name: :form_templates_purpose_check)
    |> check_constraint(:status, name: :form_templates_status_check)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(template, attrs) do
    template
    |> cast(attrs, [:name, :purpose, :sections, :status])
    |> validate_required([:name, :purpose, :sections, :status])
    |> validate_sections()
    |> check_constraint(:purpose, name: :form_templates_purpose_check)
    |> check_constraint(:status, name: :form_templates_status_check)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(t in query, where: t.business_id == ^business_id)
  end

  # Rejects template content the submission path can't safely consume: a section's `questions`
  # must be a list of maps, and any `profile_mapping` must match a shape submit_form_assignment
  # recognizes. Catching it here means a bad template never blocks a client at submit time.
  defp validate_sections(changeset) do
    sections = get_field(changeset, :sections)

    if is_nil(sections) or valid_sections?(sections) do
      changeset
    else
      add_error(changeset, :sections, "has invalid structure")
    end
  end

  defp valid_sections?(sections) when is_list(sections), do: Enum.all?(sections, &valid_section?/1)
  defp valid_sections?(_), do: false

  defp valid_section?(%{} = section) do
    case Map.get(section, "questions") do
      nil -> true
      questions when is_list(questions) -> Enum.all?(questions, &valid_question?/1)
      _ -> false
    end
  end

  defp valid_section?(_), do: false

  defp valid_question?(%{} = question) do
    case Map.get(question, "profile_mapping") do
      nil -> true
      mapping -> valid_mapping?(mapping)
    end
  end

  defp valid_question?(_), do: false

  defp valid_mapping?(%{"kind" => "core", "section" => section, "field" => field})
       when is_binary(field) and field != "",
       do: section in @core_sections

  defp valid_mapping?(%{"kind" => "custom_field", "field_key" => field_key})
       when is_binary(field_key) and field_key != "",
       do: true

  defp valid_mapping?(_), do: false
end
