defmodule Easy.Workouts.Exercise do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  @kinds [:movement, :activity, :sport, :practice]
  @goals ~w(strength endurance power mobility balance skill recovery)
  @places ~w(gym home outdoor pool court/field studio)
  @metrics ~w(reps weight duration distance elevation_gain height calories speed incline level power cadence heart_rate effort reserve successes attempts score result grade tempo)
  schema "exercises" do
    field :name, :string
    field :kind, Ecto.Enum, values: @kinds
    field :goals, {:array, :string}, default: []
    field :places, {:array, :string}, default: []
    field :metrics, {:array, :string}, default: []
    field :count_label, :string
    field :grade_scale, {:array, :string}, default: []
    field :unilateral, :boolean, default: false
    field :equipment, {:array, :string}, default: []
    field :muscles, {:array, :string}, default: []
    field :media, :string
    belongs_to :business, Easy.Orgs.Business
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs),
    do: %__MODULE__{} |> change(business_id: business_id) |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [
      :name,
      :kind,
      :goals,
      :places,
      :metrics,
      :count_label,
      :grade_scale,
      :unilateral,
      :equipment,
      :muscles,
      :media
    ])
    |> update_change(:name, &String.trim/1)
    |> default_metrics()
    |> validate_required([:name, :kind, :goals, :places, :metrics])
    |> validate_length(:name, max: 200)
    |> validate_subset(:goals, @goals)
    |> validate_subset(:places, @places)
    |> validate_subset(:metrics, @metrics)
    |> validate_change(:metrics, fn :metrics, values ->
      if Enum.uniq(values) == values, do: [], else: [metrics: "must be unique"]
    end)
    |> validate_tags()
    |> validate_grade()
    |> check_constraint(:kind, name: :exercises_taxonomy)
  end

  defp default_metrics(cs) do
    if get_field(cs, :metrics) == [] do
      defaults = %{
        movement: ~w(reps weight),
        activity: ~w(distance duration),
        sport: ~w(duration result score),
        practice: ~w(duration)
      }

      put_change(cs, :metrics, Map.get(defaults, get_field(cs, :kind), []))
    else
      cs
    end
  end

  defp validate_tags(cs) do
    Enum.reduce([:goals, :places, :metrics, :grade_scale, :equipment, :muscles], cs, fn key, acc ->
      validate_change(acc, key, &unique_tags/2)
    end)
  end

  defp unique_tags(field, values) do
    if Enum.uniq(values) == values and Enum.all?(values, &nonempty?/1),
      do: [],
      else: [{field, "use unique nonempty values"}]
  end

  defp nonempty?(value), do: is_binary(value) and String.trim(value) != ""

  defp validate_grade(cs) do
    if "grade" in get_field(cs, :metrics) and get_field(cs, :grade_scale) == [],
      do: add_error(cs, :grade_scale, "provide the ordered grade steps"),
      else: cs
  end

  @spec visible(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def visible(query \\ __MODULE__, business_id),
    do: from(e in query, where: is_nil(e.business_id) or e.business_id == ^business_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id), do: from(e in query, where: e.business_id == ^business_id)
end
