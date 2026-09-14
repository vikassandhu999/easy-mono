defmodule Easy.Landing.LandingPage do
  use Ecto.Schema

  alias Easy.LandingApplicationQuestions
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @templates [:proof_first, :problem_fit, :coach_story]
  @statuses [:draft, :published]
  @max_questions 5
  @max_programs 3

  @type t :: %__MODULE__{}

  schema "landing_pages" do
    field :slug, :string
    field :revision, :integer, default: 1
    field :template, Ecto.Enum, values: @templates
    field :eyebrow, :string
    field :headline, :string
    field :subheadline, :string
    field :coach_intro, :string
    field :hero_image_url, :string
    field :proof_points, {:array, :map}, default: []
    field :fit_points, {:array, :string}, default: []
    field :application_questions, {:array, :map}, default: []
    field :status, Ecto.Enum, values: @statuses, default: :draft

    belongs_to :business, Orgs.Business

    has_many :programs, Easy.Landing.LandingProgram,
      where: [archived_at: nil],
      preload_order: [asc: :position, asc: :id]

    timestamps(type: :utc_datetime)
  end

  @editable [
    :slug,
    :template,
    :eyebrow,
    :headline,
    :subheadline,
    :coach_intro,
    :hero_image_url,
    :proof_points,
    :fit_points,
    :application_questions,
    :status
  ]

  @spec program_inputs(map()) :: {:ok, [map()]} | {:error, :too_many_programs | Ecto.Changeset.t()}
  def program_inputs(attrs) do
    changeset = cast({%{programs: []}, %{programs: {:array, :map}}}, attrs, [:programs], empty_values: [])

    case apply_action(changeset, :insert) do
      {:ok, %{programs: programs}} when is_list(programs) ->
        cond do
          not Enum.all?(programs, &is_map/1) -> {:error, add_error(changeset, :programs, "is invalid")}
          length(programs) > @max_programs -> {:error, :too_many_programs}
          true -> {:ok, programs}
        end

      {:ok, _input} ->
        {:error, add_error(changeset, :programs, "is invalid")}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @spec application_program(t(), map()) :: {:ok, Easy.Landing.LandingProgram.t() | nil} | {:error, Ecto.Changeset.t()}
  def application_program(%__MODULE__{programs: programs}, attrs) do
    input = cast({%{}, %{landing_program_id: Ecto.UUID}}, attrs, [:landing_program_id])

    with {:ok, fields} <- apply_action(input, :insert) do
      find_application_program(programs, Map.get(fields, :landing_program_id), input)
    end
  end

  defp find_application_program(_programs, nil, _input), do: {:ok, nil}

  defp find_application_program(programs, id, input) do
    case Enum.find(programs, &(&1.id == id)) do
      nil -> {:error, add_error(input, :landing_program_id, "is no longer available on this page")}
      program -> {:ok, program}
    end
  end

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @editable, empty_values: [])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :slug, :template, :headline, :status])
    |> common_validations()
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(page, attrs) do
    page
    |> cast(attrs, @editable, empty_values: [])
    |> put_change(:revision, page.revision + 1)
    |> validate_required([:slug, :template, :headline, :status])
    |> common_validations()
  end

  defp common_validations(changeset) do
    changeset
    |> validate_copy_lengths()
    |> update_change(:slug, &normalize_slug/1)
    |> validate_format(:slug, ~r/^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: "may only contain lowercase letters, numbers and hyphens")
    |> validate_length(:slug, min: 3, max: 60)
    |> validate_length(:application_questions, max: @max_questions, message: "can have at most #{@max_questions} questions")
    |> nonnull_collection(:application_questions)
    |> nonnull_collection(:proof_points)
    |> nonnull_collection(:fit_points)
    |> validate_length(:proof_points, max: 6)
    |> validate_length(:fit_points, max: 8)
    |> validate_change(:proof_points, &validate_proof/2)
    |> validate_change(:fit_points, &validate_fit/2)
    |> LandingApplicationQuestions.validate_questions()
    |> validate_format(:hero_image_url, ~r/^https?:\/\/[^\s]+$/i, message: "must be an http or https address")
    |> unique_constraint(:slug)
    |> unique_constraint(:status,
      name: :landing_pages_one_published_per_business,
      message: "you can only publish one page"
    )
    |> check_constraint(:template, name: :landing_pages_template_check)
    |> check_constraint(:status, name: :landing_pages_status_check)
  end

  defp validate_copy_lengths(changeset) do
    Enum.reduce([:eyebrow, :headline, :subheadline, :coach_intro, :hero_image_url], changeset, fn field, acc ->
      validate_length(acc, field, max: 255)
    end)
  end

  defp validate_proof(field, points) do
    if Enum.all?(points, &valid_proof?/1), do: [], else: [{field, "each fact needs a value and label of up to 255 characters"}]
  end

  defp valid_proof?(point) when is_map(point) do
    {%{}, %{label: :string, value: :string}}
    |> cast(point, [:label, :value])
    |> validate_required([:label, :value])
    |> validate_length(:label, max: 255)
    |> validate_length(:value, max: 255)
    |> Map.fetch!(:valid?)
  end

  defp valid_proof?(_point), do: false

  defp validate_fit(field, points) do
    if Enum.all?(points, &(String.trim(&1) != "" and String.length(&1) <= 255)), do: [], else: [{field, "each point needs text of up to 255 characters"}]
  end

  defp nonnull_collection(changeset, field) do
    if is_nil(get_field(changeset, field)), do: add_error(changeset, field, "must be a list"), else: changeset
  end

  defp normalize_slug(nil), do: nil
  defp normalize_slug(slug), do: slug |> String.trim() |> String.downcase()

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_slug(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_slug(query \\ __MODULE__, slug) do
    from(p in query, where: p.slug == ^slug)
  end

  @spec published(Ecto.Queryable.t()) :: Ecto.Query.t()
  def published(query \\ __MODULE__) do
    from(p in query, where: p.status == :published)
  end

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__), do: from(p in query, order_by: [asc: p.inserted_at, asc: p.id])

  @spec include_programs(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_programs(query \\ __MODULE__), do: from(p in query, preload: [:programs])

  @spec include_business(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_business(query \\ __MODULE__), do: from(p in query, preload: [:business])
end
