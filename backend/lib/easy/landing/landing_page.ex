defmodule Easy.Landing.LandingPage do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @templates [:proof_first, :problem_fit, :coach_story]
  @statuses [:draft, :published]
  @max_questions 5

  @type t :: %__MODULE__{}

  schema "landing_pages" do
    field :slug, :string
    field :template, Ecto.Enum, values: @templates
    field :headline, :string
    field :subheadline, :string
    field :coach_intro, :string
    field :proof_points, {:array, :map}, default: []
    field :application_questions, {:array, :map}, default: []
    field :status, Ecto.Enum, values: @statuses, default: :draft

    belongs_to :business, Orgs.Business
    has_many :programs, Easy.Landing.LandingProgram, preload_order: [asc: :position]

    timestamps(type: :utc_datetime)
  end

  @editable [:slug, :template, :headline, :subheadline, :coach_intro, :proof_points, :application_questions, :status]

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @editable)
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :slug, :template, :headline, :status])
    |> common_validations()
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(page, attrs) do
    page
    |> cast(attrs, @editable)
    |> validate_required([:slug, :template, :headline, :status])
    |> common_validations()
  end

  defp common_validations(changeset) do
    changeset
    |> update_change(:slug, &normalize_slug/1)
    |> validate_format(:slug, ~r/^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: "may only contain lowercase letters, numbers and hyphens")
    |> validate_length(:slug, min: 3, max: 60)
    |> validate_length(:application_questions, max: @max_questions, message: "can have at most #{@max_questions} questions")
    |> unique_constraint(:slug)
    |> unique_constraint(:status,
      name: :landing_pages_one_published_per_business,
      message: "you can only publish one page"
    )
    |> check_constraint(:template, name: :landing_pages_template_check)
    |> check_constraint(:status, name: :landing_pages_status_check)
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
end
