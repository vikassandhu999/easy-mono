defmodule Easy.Workouts.Exercise do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Attachments.Attachment
  alias Easy.Workouts.{ExerciseMedia, ExerciseMetric}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  @kinds [:movement, :activity, :sport, :practice]
  @goals [:strength, :endurance, :power, :mobility, :balance, :skill, :recovery]
  @places [:gym, :home, :outdoor, :pool, :"court/field", :studio]
  @lists [:goals, :places, :muscles]
  @editable [
    :name,
    :instructions,
    :kind,
    :goals,
    :places,
    :equipment,
    :muscles
  ]

  schema "exercises" do
    # Null business_id means built-in; the trusted caller sets ownership on insert.
    belongs_to(:business, Easy.Orgs.Business)

    field(:name, :string)
    # Optional plain-text directions for the exercise; line breaks are preserved.
    field(:instructions, :string)
    field(:kind, Ecto.Enum, values: @kinds)

    # Optional selections; empty lists are valid.
    field(:goals, {:array, Ecto.Enum}, values: @goals, default: [])
    field(:places, {:array, Ecto.Enum}, values: @places, default: [])

    # JSONB array order controls display order; each catalogue key occurs once.
    embeds_many(:metrics, ExerciseMetric, on_replace: :delete)

    # Optional description, including alternatives and optional equipment.
    field(:equipment, :string)
    # One free-text muscle name per entry. Empty means not classified.
    field(:muscles, {:array, :string}, default: [])
    # No rows means no demonstration. Gallery writes use ExerciseMedia separately.
    has_many(:media, Easy.Workouts.ExerciseMedia, preload_order: [asc: :position])

    # Archive/Restore actions own this field; ordinary edit params cannot set it.
    # Exclude archived exercises from pickers, not from existing workout lookups.
    field(:archived_at, :utc_datetime)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> change(business_id: business_id)
    |> cast(attrs, @editable, empty_values: [])
    |> default_metrics()
    |> cast_embed(:metrics)
    |> validate()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(exercise, attrs) do
    exercise
    |> cast(attrs, @editable, empty_values: [])
    |> cast_embed(:metrics)
    |> validate()
  end

  # The context must authorize archive/restore using the existing ownership rules.
  @spec archive_changeset(t(), DateTime.t()) :: Ecto.Changeset.t()
  def archive_changeset(exercise, now) do
    archived_at = exercise.archived_at || now
    change(exercise, archived_at: archived_at)
  end

  @spec restore_changeset(t()) :: Ecto.Changeset.t()
  def restore_changeset(exercise), do: change(exercise, archived_at: nil)

  # Only an omitted selection on creation receives the kind's default metrics.
  defp default_metrics(changeset) do
    if Map.has_key?(changeset.params || %{}, "metrics") do
      changeset
    else
      keys =
        case get_field(changeset, :kind) do
          :movement -> [:reps, :weight]
          :activity -> [:distance, :duration]
          :sport -> [:duration, :result, :score]
          :practice -> [:duration]
          _ -> []
        end

      put_embed(changeset, :metrics, Enum.map(keys, &%ExerciseMetric{key: &1}))
    end
  end

  defp validate(changeset) do
    changeset
    |> update_change(:name, &trim_text/1)
    |> update_change(:instructions, &optional_text/1)
    |> update_change(:equipment, &optional_text/1)
    |> trim_muscles()
    |> validate_required([:name, :kind])
    |> validate_length(:name, min: 1, max: 200)
    |> validate_lists()
    |> validate_unique_metrics()
    |> database_constraints()
  end

  defp trim_text(nil), do: nil
  defp trim_text(value), do: String.trim(value)

  defp optional_text(value) do
    case trim_text(value) do
      "" -> nil
      text -> text
    end
  end

  defp trim_muscles(changeset) do
    update_change(changeset, :muscles, &trim_muscle_names/1)
  end

  defp trim_muscle_names(values) when is_list(values) do
    Enum.map(values, fn value ->
      if is_binary(value), do: String.trim(value), else: value
    end)
  end

  defp trim_muscle_names(value), do: value

  defp validate_lists(changeset) do
    Enum.reduce(@lists, changeset, &validate_list(&2, &1))
  end

  defp validate_list(changeset, field) do
    case get_field(changeset, field) do
      values when is_list(values) ->
        if Enum.uniq(values) == values and Enum.all?(values, &nonempty_element?/1),
          do: changeset,
          else: add_error(changeset, field, "use unique, nonempty entries")

      _ ->
        add_error(changeset, field, "must be a list; use [] when no entries apply")
    end
  end

  defp nonempty_element?(value) when is_atom(value), do: not is_nil(value)
  defp nonempty_element?(value) when is_binary(value), do: String.trim(value) != ""
  defp nonempty_element?(_), do: false

  defp validate_unique_metrics(changeset) do
    keys = Enum.map(get_field(changeset, :metrics), & &1.key)

    if Enum.uniq(keys) == keys,
      do: changeset,
      else: add_error(changeset, :metrics, "select each metric only once")
  end

  # These checks are proposed for the later migration; they are not applied yet.
  # Only name and kind are required user inputs. Collection columns are NOT NULL
  # arrays that allow []. Nonempty tag/facet arrays are one-dimensional and start
  # at index 1. Entries are unique and non-null; goals/places use catalogue values.
  # Free-text entries are trimmed/nonblank.
  # Instructions are optional plain text: null or trimmed/nonblank.
  # Equipment is optional text: null or trimmed/nonblank. It is not a tag array.
  # metrics is a JSONB array (possibly empty) of {key, label} objects with unique catalogue
  # keys; label is null or trimmed/nonblank text. Name is trimmed/nonblank, max 200.
  # Media rules belong to Attachment and ExerciseMedia under ADR 0003.
  # business_id keeps its FK and tenant-leading index; only system writers use null.
  defp database_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> check_constraint(:name, name: :exercises_name_valid)
    |> check_constraint(:instructions, name: :exercises_instructions_valid)
    |> check_constraint(:kind, name: :exercises_kind_valid)
    |> check_constraint(:goals, name: :exercises_goals_valid)
    |> check_constraint(:places, name: :exercises_places_valid)
    |> check_constraint(:metrics, name: :exercises_metrics_valid)
    |> check_constraint(:equipment, name: :exercises_equipment_valid)
    |> check_constraint(:muscles, name: :exercises_muscles_valid)
  end

  @spec visible(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def visible(query \\ __MODULE__, business_id),
    do: from(e in query, where: is_nil(e.business_id) or e.business_id == ^business_id)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id), do: from(e in query, where: e.business_id == ^business_id)

  @spec selectable(Ecto.Queryable.t()) :: Ecto.Query.t()
  def selectable(query \\ __MODULE__), do: from(e in query, where: is_nil(e.archived_at))

  @spec include_media(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_media(query \\ __MODULE__, business_id) do
    attachments = from(a in Attachment, where: a.business_id == ^business_id)

    media =
      ExerciseMedia
      |> where([m], m.business_id == ^business_id)
      |> order_by([m], asc: m.position, asc: m.id)
      |> preload(attachment: ^attachments)

    preload(query, media: ^media)
  end
end
