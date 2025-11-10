defmodule Easy.MealPlans.Plan do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_plans" do
    field :name, :string
    field :description, :string
    field :status, :string, default: "draft"
    field :cover_image_url, :string
    field :start_date, :date
    field :end_date, :date
    field :timezone, :string

    belongs_to :business, Easy.Organizations.Business, type: :binary_id
    belongs_to :created_by, Easy.Coaches.Coach, type: :binary_id
    belongs_to :assigned_to, Easy.Clients.Client, type: :binary_id

    has_many :meal_plan_meals, Easy.MealPlans.MealPlanMeal, foreign_key: :meal_plan_id

    timestamps()
  end

  @valid_statuses ~w(published draft archived)

  @required_fields ~w(name business_id created_by_id)a
  @optional_fields ~w(description status cover_image_url start_date end_date timezone assigned_to_id)a

  def changeset(plan, attrs) do
    plan
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_length(:name, min: 1, max: 255)
    |> validate_length(:description, max: 2000)
    |> validate_inclusion(:status, @valid_statuses)
    |> validate_date_range()
    |> validate_timezone()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:created_by_id)
    |> foreign_key_constraint(:assigned_to_id)
  end

  def create_changeset(attrs) do
    %__MODULE__{}
    |> changeset(attrs)
  end

  def update_changeset(plan, attrs) do
    plan
    |> changeset(attrs)
  end

  def assign_to_client_changeset(plan, client_id, attrs \\ %{}) do
    attrs = Map.merge(attrs, %{assigned_to_id: client_id})

    plan
    |> cast(attrs, [:assigned_to_id, :start_date, :end_date, :timezone])
    |> validate_required([:assigned_to_id, :start_date, :timezone])
    |> validate_date_range()
    |> validate_timezone()
    |> foreign_key_constraint(:assigned_to_id)
  end

  def publish_changeset(plan) do
    plan
    |> change(status: "published")
    |> validate_can_publish()
  end

  def archive_changeset(plan) do
    plan
    |> change(status: "archived")
  end

  defp validate_date_range(changeset) do
    start_date = get_field(changeset, :start_date)
    end_date = get_field(changeset, :end_date)

    cond do
      is_nil(start_date) or is_nil(end_date) ->
        changeset

      Date.compare(end_date, start_date) == :lt ->
        add_error(changeset, :end_date, "must be after start date")

      true ->
        changeset
    end
  end

  defp validate_timezone(changeset) do
    timezone = get_field(changeset, :timezone)

    cond do
      is_nil(timezone) ->
        changeset

      not valid_timezone?(timezone) ->
        add_error(changeset, :timezone, "is not a valid timezone")

      true ->
        changeset
    end
  end

  defp validate_can_publish(changeset) do
    name = get_field(changeset, :name)

    if is_nil(name) or String.trim(name) == "" do
      add_error(changeset, :name, "must be present to publish")
    else
      changeset
    end
  end

  defp valid_timezone?(timezone) when is_binary(timezone) do
    trimmed = String.trim(timezone)

    cond do
      trimmed == "" ->
        false

      not timezone_format_valid?(trimmed) ->
        false

      timezone_database_supports_full_data?() ->
        match?({:ok, _}, DateTime.now(trimmed))

      true ->
        true
    end
  end

  defp valid_timezone?(_), do: false

  defp timezone_format_valid?(timezone) do
    Regex.match?(~r/^[A-Za-z0-9_+\-]+(?:\/[A-Za-z0-9_+\-]+)+$/, timezone)
  end

  defp timezone_database_supports_full_data? do
    Calendar.get_time_zone_database() != Calendar.UTCOnlyTimeZoneDatabase
  end

  def template?(plan) do
    is_nil(plan.assigned_to_id)
  end

  def assigned?(plan) do
    not is_nil(plan.assigned_to_id)
  end

  def published?(plan) do
    plan.status == "published"
  end

  def archived?(plan) do
    plan.status == "archived"
  end
end
