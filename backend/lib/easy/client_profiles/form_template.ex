defmodule Easy.ClientProfiles.FormTemplate do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @purposes [:intake, :check_in]
  @statuses [:active, :archived]
  @core_sections ["general", "nutrition", "training", "lifestyle"]
  @question_types ~w(text number boolean date select multi_select rating weight)

  @type t :: %__MODULE__{}

  schema "form_templates" do
    field :name, :string
    field :purpose, Ecto.Enum, values: @purposes
    field :sections, {:array, :map}, default: []
    field :status, Ecto.Enum, values: @statuses, default: :active
    field :system_key, :string

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

  @spec insert_system_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_system_changeset(business_id, system_key, attrs) do
    business_id
    |> insert_changeset(attrs)
    |> put_change(:system_key, system_key)
    |> unique_constraint([:business_id, :system_key])
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

  @spec with_system_key(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def with_system_key(query \\ __MODULE__, system_key) do
    from(t in query, where: t.system_key == ^system_key)
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
    valid_question_identity?(question) and
      valid_question_options?(question) and
      valid_required_flag?(question) and
      valid_question_mapping?(question)
  end

  defp valid_question?(_), do: false

  defp valid_question_identity?(%{"id" => id, "label" => label, "type" => type}) do
    is_binary(id) and id != "" and is_binary(label) and label != "" and type in @question_types
  end

  defp valid_question_identity?(_question), do: false

  defp valid_question_options?(%{"type" => type, "options" => options})
       when type in ["select", "multi_select"],
       do: options != [] and is_list(options) and Enum.all?(options, &(is_binary(&1) and &1 != ""))

  defp valid_question_options?(%{"type" => type}) when type in ["select", "multi_select"], do: false
  defp valid_question_options?(_question), do: true

  defp valid_required_flag?(%{"required" => required}), do: is_boolean(required)
  defp valid_required_flag?(_question), do: true

  defp valid_question_mapping?(question) do
    case Map.get(question, "profile_mapping") do
      nil -> true
      mapping -> valid_mapping?(mapping)
    end
  end

  defp valid_mapping?(%{"kind" => "core", "section" => section, "field" => field})
       when is_binary(field) and field != "",
       do: section in @core_sections

  defp valid_mapping?(%{"kind" => "custom_field", "field_key" => field_key})
       when is_binary(field_key) and field_key != "",
       do: true

  defp valid_mapping?(_), do: false
end
