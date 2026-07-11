defmodule Easy.ClientProfiles.FormSubmission do
  use Ecto.Schema

  alias Easy.ClientProfiles.FormAssignment
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @actors [:coach, :client, :system]

  @type t :: %__MODULE__{}

  schema "form_submissions" do
    field :question_snapshot, {:array, :map}, default: []
    field :answers, :map, default: %{}
    field :submitted_by_type, Ecto.Enum, values: @actors
    field :submitted_by_id, :binary_id
    field :submitted_at, :utc_datetime
    field :reviewed_at, :utc_datetime
    field :attachments, {:array, :map}, virtual: true, default: []

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :form_assignment, FormAssignment
    belongs_to :reviewed_by, User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), atom(), binary() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, form_assignment_id, submitted_by_type, submitted_by_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:question_snapshot, :answers, :submitted_at])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:form_assignment_id, form_assignment_id)
    |> put_change(:submitted_by_type, submitted_by_type)
    |> put_change(:submitted_by_id, submitted_by_id)
    |> validate_required([
      :business_id,
      :client_id,
      :form_assignment_id,
      :question_snapshot,
      :answers,
      :submitted_by_type,
      :submitted_at
    ])
    |> check_constraint(:submitted_by_type, name: :form_submissions_submitted_by_type_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :form_submissions_client_business_id_fkey)
    |> foreign_key_constraint(:form_assignment_id,
      name: :form_submissions_assignment_client_business_id_fkey
    )
  end

  @spec validate_answers([map()], map()) ::
          :ok | {:error, :unknown_answer_keys | :missing_required_answers | :invalid_answer_values}
  def validate_answers(sections, answers) when is_list(sections) and is_map(answers) do
    questions =
      for %{"questions" => questions} <- sections,
          is_list(questions),
          %{"id" => id} = question <- questions,
          is_binary(id),
          do: question

    known_ids = MapSet.new(questions, & &1["id"])

    cond do
      Enum.any?(Map.keys(answers), &(not MapSet.member?(known_ids, &1))) ->
        {:error, :unknown_answer_keys}

      Enum.any?(questions, &missing_required?(&1, answers)) ->
        {:error, :missing_required_answers}

      Enum.any?(questions, &invalid_value?(&1, answers)) ->
        {:error, :invalid_answer_values}

      true ->
        :ok
    end
  end

  @spec for_assignment(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_assignment(query \\ __MODULE__, business_id, assignment_id) do
    from(s in query, where: s.business_id == ^business_id and s.form_assignment_id == ^assignment_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(s in query, where: s.business_id == ^business_id)
  end

  @spec unreviewed(Ecto.Queryable.t()) :: Ecto.Query.t()
  def unreviewed(query \\ __MODULE__), do: from(s in query, where: is_nil(s.reviewed_at))

  @spec for_check_ins(Ecto.Queryable.t()) :: Ecto.Query.t()
  def for_check_ins(query \\ __MODULE__) do
    from(s in query,
      join: assignment in FormAssignment,
      as: :review_assignment,
      on:
        assignment.id == s.form_assignment_id and assignment.business_id == s.business_id and
          assignment.purpose == :check_in
    )
  end

  @spec for_visible_clients(Ecto.Queryable.t(), Ctx.t()) :: Ecto.Query.t()
  def for_visible_clients(query \\ __MODULE__, %Ctx{} = ctx) do
    visible_clients = Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx)

    from(s in query,
      join: client in ^visible_clients,
      as: :review_client,
      on: client.id == s.client_id and client.business_id == s.business_id
    )
  end

  @spec include_review_context(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_review_context(query \\ __MODULE__, business_id) do
    from([s, review_assignment: assignment, review_client: client] in query,
      join: template in Easy.ClientProfiles.FormTemplate,
      on: template.id == assignment.form_template_id and template.business_id == ^business_id,
      preload: [client: client, form_assignment: {assignment, form_template: template}]
    )
  end

  @spec review_changeset(t(), String.t(), DateTime.t()) :: Ecto.Changeset.t()
  def review_changeset(submission, reviewed_by_id, reviewed_at) do
    submission
    |> change(reviewed_by_id: reviewed_by_id, reviewed_at: reviewed_at)
    |> validate_required([:reviewed_by_id, :reviewed_at])
    |> foreign_key_constraint(:reviewed_by_id)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(s in query, order_by: [desc: s.submitted_at, desc: s.id])
  end

  defp missing_required?(%{"required" => true, "id" => id}, answers),
    do: blank_answer?(Map.get(answers, id))

  defp missing_required?(_question, _answers), do: false

  defp blank_answer?(value), do: value in [nil, "", []]

  defp invalid_value?(%{"id" => id} = question, answers) do
    value = Map.get(answers, id)
    not blank_answer?(value) and not valid_value?(question["type"], value, question)
  end

  defp valid_value?("text", value, _question), do: is_binary(value)
  defp valid_value?("number", value, _question), do: is_number(value)
  defp valid_value?("boolean", value, _question), do: is_boolean(value)

  defp valid_value?("date", value, _question),
    do: is_binary(value) and match?({:ok, _date}, Date.from_iso8601(value))

  defp valid_value?("select", value, question),
    do: is_binary(value) and value in question_options(question)

  defp valid_value?("multi_select", value, question) do
    options = question_options(question)
    is_list(value) and value != [] and Enum.all?(value, &(is_binary(&1) and &1 in options))
  end

  defp valid_value?("rating", value, _question), do: is_integer(value) and value in 1..5

  defp valid_value?("weight", value, _question),
    do: is_number(value) and value > 0 and value < 1000

  defp valid_value?("photo", value, _question) do
    is_list(value) and value != [] and length(value) <= 4 and length(Enum.uniq(value)) == length(value) and
      Enum.all?(value, &valid_uuid?/1)
  end

  defp valid_value?(_type, _value, _question), do: false

  defp question_options(%{"options" => options}) when is_list(options), do: options
  defp question_options(_question), do: []

  defp valid_uuid?(value) when is_binary(value), do: match?({:ok, _uuid}, Ecto.UUID.cast(value))
  defp valid_uuid?(_value), do: false
end
