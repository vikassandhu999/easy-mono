defmodule Easy.Nutrition.NutritionPlan do
  use Easy.Nutrition.Schema

  alias Easy.Organizations.{Business, Coach}
  alias Easy.Clients.Client
  alias Easy.Nutrition.Meal

  schema "nutrition_plans" do
    field :name, :string
    field :description, :string
    field :thumbnail_url, :string

    field :is_template, :boolean, default: true

    field :status, Ecto.Enum, values: [:active, :draft, :archived], default: :active

    # Weekly plans: start_date and end_date define the repeating period for assigned plans
    field :start_date, :date
    field :end_date, :date

    field :tags, {:array, :string}, default: []

    belongs_to :client, Client

    belongs_to :original_template, __MODULE__, foreign_key: :original_template_id

    belongs_to :business, Business
    belongs_to :author, Coach

    has_many :meals, Meal,
      foreign_key: :nutrition_plan_id,
      on_delete: :delete_all,
      preload_order: [asc: :day_number, asc: :position]

    timestamps()
  end

  @doc false
  def changeset(nutrition_plan, attrs) do
    nutrition_plan
    |> cast(attrs, [
      :name,
      :description,
      :thumbnail_url,
      :is_template,
      :status,
      :start_date,
      :end_date,
      :tags,
      :client_id,
      :original_template_id,
      :business_id,
      :author_id
    ])
    |> validate_required([:name, :status, :business_id, :author_id])
    |> validate_length(:name, min: 2, max: 255)
    |> validate_length(:description, max: 255)
    |> validate_format(:thumbnail_url, ~r/^https?:\/\/.+/, message: "must be a valid URL")
    |> validate_template_or_client()
    |> validate_date_range()
    |> check_constraint(:start_date,
      name: :valid_date_range,
      message: "end date must be after start date"
    )
    |> check_constraint(:start_date,
      name: :assigned_plans_have_dates,
      message: "assigned plans must have start and end dates"
    )
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:author_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:original_template_id)
    |> cast_assoc(:meals, with: &Meal.changeset/2)
  end

  defp validate_template_or_client(changeset) do
    is_template = get_field(changeset, :is_template)
    client_id = get_field(changeset, :client_id)

    cond do
      is_template && client_id ->
        add_error(changeset, :client_id, "template cannot have a client assigned")

      !is_template && is_nil(client_id) ->
        add_error(changeset, :client_id, "assigned plan must have a client")

      true ->
        changeset
    end
  end

  defp validate_date_range(changeset) do
    start_date = get_field(changeset, :start_date)
    end_date = get_field(changeset, :end_date)
    is_template = get_field(changeset, :is_template)

    cond do
      # Templates don't need dates
      is_template ->
        changeset

      # Assigned plans require both dates
      !is_template && (is_nil(start_date) || is_nil(end_date)) ->
        changeset
        |> add_error(:start_date, "assigned plan must have a start date")
        |> add_error(:end_date, "assigned plan must have an end date")

      # Validate end_date is after or equal to start_date
      start_date && end_date && Date.compare(end_date, start_date) == :lt ->
        add_error(changeset, :end_date, "must be after or equal to start date")

      true ->
        changeset
    end
  end
end
