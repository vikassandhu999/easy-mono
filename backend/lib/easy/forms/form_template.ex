defmodule Easy.Forms.FormTemplate do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @purposes [:intake, :check_in]
  @statuses [:active, :archived]
  @question_types ~w(text number boolean date select multi_select rating weight photo service_type)

  @type t :: %__MODULE__{}

  schema "form_templates" do
    field :name, :string
    field :purpose, Ecto.Enum, values: @purposes
    field :sections, {:array, :map}, default: []
    field :status, Ecto.Enum, values: @statuses, default: :active
    field :is_default_intake, :boolean, default: false
    # How many times clients have submitted this form. Counted through assignments,
    # since a submission belongs to an assignment rather than to the template.
    field :response_count, :integer, virtual: true, default: 0
    field :system_key, :string
    field :system_version, :integer

    belongs_to :business, Orgs.Business
    has_many :form_assignments, Easy.Forms.FormAssignment

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :purpose, :sections, :status])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :purpose])
    |> validate_template()
    |> check_constraint(:purpose, name: :form_templates_purpose_check)
    |> foreign_key_constraint(:business_id)
  end

  @spec insert_system_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_system_changeset(business_id, system_key, attrs) do
    business_id
    |> insert_changeset(attrs)
    |> put_change(:system_key, system_key)
    |> put_change(:system_version, Map.fetch!(attrs, "system_version"))
    |> check_constraint(:system_version, name: :form_templates_system_version_positive)
    |> unique_constraint([:business_id, :system_key])
  end

  @spec system_content_changeset(t(), [map()], pos_integer()) :: Ecto.Changeset.t()
  def system_content_changeset(template, sections, system_version) do
    template
    |> change(sections: sections, system_version: system_version)
    |> validate_sections()
    |> validate_service_type_questions()
    |> check_constraint(:system_version, name: :form_templates_system_version_positive)
  end

  @spec delete_changeset(t()) :: Ecto.Changeset.t()
  def delete_changeset(template) do
    template
    |> change()
    |> no_assoc_constraint(:form_assignments,
      name: :form_assignments_template_business_id_fkey,
      message: "has assignments"
    )
  end

  # Purpose is fixed at creation — it is deliberately not castable here.
  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(template, attrs) do
    template
    |> cast(attrs, [:name, :sections, :status])
    |> validate_template()
  end

  defp validate_template(changeset) do
    changeset
    |> validate_required([:name, :sections, :status])
    |> validate_length(:name, max: 255, count: :codepoints)
    |> validate_sections()
    |> validate_service_type_questions()
    |> check_constraint(:status, name: :form_templates_status_check)
  end

  @spec default_intake_changeset(t(), boolean()) :: Ecto.Changeset.t()
  def default_intake_changeset(template, default?) when is_boolean(default?) do
    template
    |> change(is_default_intake: default?)
    |> unique_constraint(:is_default_intake, name: :form_templates_one_default_intake_index)
  end

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__), do: from(t in query, order_by: [asc: t.inserted_at, asc: t.id])

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(t in query, where: t.business_id == ^business_id)
  end

  @spec for_search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def for_search(query, search) when search in [nil, ""], do: query

  def for_search(query, search) do
    pattern = search |> String.trim() |> Easy.Search.like_pattern()
    from(t in query, where: ilike(t.name, ^pattern))
  end

  @spec for_purpose(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def for_purpose(query, nil), do: query
  def for_purpose(query, purpose), do: from(t in query, where: t.purpose == ^purpose)

  @spec active_intake(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active_intake(query \\ __MODULE__) do
    from(t in query, where: t.purpose == :intake and t.status == :active)
  end

  @spec default_intake(Ecto.Queryable.t()) :: Ecto.Query.t()
  def default_intake(query \\ __MODULE__) do
    from(t in query, where: t.is_default_intake)
  end

  # `join_*`, not `include_*`: a computed column rather than a preload (AGENTS.md
  # query-builder taxonomy). A submission hangs off an ASSIGNMENT, so the count
  # walks template -> assignments -> submissions, business-scoped at both hops.
  @spec join_response_count(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def join_response_count(query \\ __MODULE__, business_id) do
    counts =
      from(a in Easy.Forms.FormAssignment,
        join: s in Easy.Forms.FormSubmission,
        on: s.form_assignment_id == a.id and s.business_id == a.business_id,
        where: a.business_id == ^business_id,
        group_by: a.form_template_id,
        select: %{template_id: a.form_template_id, responses: count(s.id)}
      )

    from(t in query,
      left_join: c in subquery(counts),
      on: c.template_id == t.id,
      select: %{t | response_count: coalesce(c.responses, 0)}
    )
  end

  @spec for_system_key(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_system_key(query \\ __MODULE__, system_key) do
    from(t in query, where: t.system_key == ^system_key)
  end

  # Rejects template content the submission path can't safely consume: a section's `questions`
  # must be a list of maps. Catching it here means a bad template never blocks a client at
  # submit time.
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
      valid_required_flag?(question)
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
  defp valid_question_options?(%{"type" => "service_type"} = question), do: not Map.has_key?(question, "options")
  defp valid_question_options?(_question), do: true

  defp valid_required_flag?(%{"required" => required}), do: is_boolean(required)
  defp valid_required_flag?(_question), do: true

  defp validate_service_type_questions(changeset) do
    questions = service_type_questions(get_field(changeset, :sections))

    case {get_field(changeset, :purpose), length(questions)} do
      {:check_in, count} when count > 0 ->
        add_error(changeset, :sections, "Service type is only allowed on Intake templates")

      {:intake, count} when count > 1 ->
        add_error(changeset, :sections, "may contain at most one Service type question")

      _other ->
        changeset
    end
  end

  defp service_type_questions(sections) do
    for %{"questions" => questions} <- List.wrap(sections),
        question when is_map(question) <- List.wrap(questions),
        question["type"] == "service_type",
        do: question
  end
end
