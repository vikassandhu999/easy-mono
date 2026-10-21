defmodule Easy.Workouts.Workout do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Workouts.{Exercise, ExerciseGroup}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "workouts" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:client, Easy.Clients.Client)

    field(:name, :string)
    field(:description, :string)

    field(:type, Ecto.Enum, values: [:prescribed, :video, :open], default: :prescribed)

    belongs_to(:video, Easy.Attachments.Attachment)
    field(:archived_at, :utc_datetime)

    embeds_many(:groups, Easy.Workouts.ExerciseGroup, on_replace: :delete)
    has_many(:exercise_references, Easy.Workouts.WorkoutExerciseReference)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t() | nil, map(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs, exercises_by_id) do
    %__MODULE__{}
    |> change(business_id: business_id, client_id: client_id)
    |> update_changeset(attrs, exercises_by_id)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs, exercises_by_id) when is_map(exercises_by_id) do
    workout
    |> cast(attrs, [:name, :description, :type, :video_id], empty_values: [])
    |> update_change(:name, &trim_text/1)
    |> update_change(:description, &optional_text/1)
    |> validate_required([:business_id, :name, :type])
    |> validate_length(:name, min: 1, max: 200)
    |> validate_reference_ids()
    |> cast_groups(exercises_by_id)
    |> validate_unique_structure()
    |> validate_content_for_save()
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

  defp validate_reference_ids(changeset) do
    Enum.reduce([:business_id, :client_id, :video_id], changeset, &validate_reference_id(&2, &1))
  end

  defp validate_reference_id(changeset, field) do
    case get_field(changeset, field) do
      nil ->
        changeset

      value ->
        case Ecto.UUID.cast(value) do
          {:ok, id} -> put_change(changeset, field, id)
          :error -> add_error(changeset, field, "must be a valid UUID")
        end
    end
  end

  defp cast_groups(changeset, exercises_by_id) do
    business_id = get_field(changeset, :business_id)

    exercises_by_id =
      Map.filter(exercises_by_id, fn {_id, exercise} ->
        match?(%Exercise{}, exercise) and exercise.business_id in [nil, business_id]
      end)

    current = get_field(changeset, :groups)

    previous_entries =
      for group <- current,
          entry <- group.exercises,
          not is_nil(entry.id),
          into: %{},
          do: {entry.id, entry}

    case Map.fetch(changeset.params, "groups") do
      :error ->
        groups =
          Enum.map(current, &ExerciseGroup.changeset(&1, %{}, exercises_by_id, previous_entries))

        put_embed(changeset, :groups, groups)

      {:ok, values} when is_list(values) ->
        if Enum.all?(values, &(is_map(&1) and not is_struct(&1))),
          do: cast_group_list(changeset, values, current, exercises_by_id, previous_entries),
          else: add_error(changeset, :groups, "must be an array of group objects")

      {:ok, _} ->
        add_error(changeset, :groups, "must be an array of group objects")
    end
  end

  defp cast_group_list(changeset, values, current, exercises_by_id, previous_entries) do
    params =
      Enum.map(values, fn value ->
        Map.new(value, fn {key, item} -> {to_string(key), item} end)
      end)

    group_ids = Enum.map(params, & &1["id"])

    entry_ids = Enum.flat_map(params, &entry_ids/1)

    case identity_error(group_ids, "group") || identity_error(entry_ids, "exercise occurrence") do
      nil ->
        previous_groups =
          for group <- current, not is_nil(group.id), into: %{}, do: {group.id, group}

        groups =
          Enum.map(params, fn attrs ->
            group = Map.get(previous_groups, canonical_id(attrs["id"]), %ExerciseGroup{})
            ExerciseGroup.changeset(group, attrs, exercises_by_id, previous_entries)
          end)

        put_embed(changeset, :groups, groups)

      error ->
        add_error(changeset, :groups, error)
    end
  end

  defp entry_ids(%{"exercises" => entries}) when is_list(entries) do
    for entry <- entries,
        is_map(entry) and not is_struct(entry),
        do: Map.get(entry, "id", Map.get(entry, :id))
  end

  defp entry_ids(_group), do: []

  defp canonical_id(nil), do: nil

  defp canonical_id(value) do
    {:ok, id} = Ecto.UUID.cast(value)
    id
  end

  defp validate_unique_structure(changeset) do
    groups = get_field(changeset, :groups)
    entries = Enum.flat_map(groups, & &1.exercises)

    Enum.reduce(
      [{Enum.map(groups, & &1.id), "group"}, {Enum.map(entries, & &1.id), "exercise occurrence"}],
      changeset,
      fn {ids, label}, acc ->
        case identity_error(ids, label) do
          nil -> acc
          error -> add_error(acc, :groups, error)
        end
      end
    )
  end

  defp identity_error(ids, label) do
    parsed = ids |> Enum.reject(&is_nil/1) |> Enum.map(&Ecto.UUID.cast/1)

    cond do
      :error in parsed -> "#{label} IDs must be valid UUIDs"
      Enum.uniq(parsed) != parsed -> "#{label} IDs must be unique within the workout"
      true -> nil
    end
  end

  defp database_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :workouts_client_id_business_id_fkey)
    |> foreign_key_constraint(:video_id)
    |> check_constraint(:name, name: :workouts_name_check)
    |> check_constraint(:groups, name: :workouts_content_valid)
  end

  @spec validate_content_for_save(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_content_for_save(changeset) do
    case get_field(changeset, :type) do
      :prescribed ->
        changeset |> require_no_video() |> validate_group_content()

      :video ->
        changeset |> validate_required([:video_id]) |> require_no_groups()

      :open ->
        changeset |> require_no_video() |> require_no_groups()

      _ ->
        add_error(changeset, :type, "must be prescribed, video, or open")
    end
  end

  @spec validate_content_for_schedule(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_content_for_schedule(changeset) do
    changeset = validate_content_for_save(changeset)

    if get_field(changeset, :type) == :prescribed and get_field(changeset, :groups) == [],
      do: add_error(changeset, :groups, "must contain exercises before scheduling"),
      else: changeset
  end

  defp require_no_video(changeset) do
    if is_nil(get_field(changeset, :video_id)),
      do: changeset,
      else: add_error(changeset, :video_id, "only a video workout can reference a video")
  end

  defp require_no_groups(changeset) do
    if get_field(changeset, :groups) == [],
      do: changeset,
      else: add_error(changeset, :groups, "must be empty for this workout type")
  end

  defp validate_group_content(changeset) do
    groups = get_field(changeset, :groups)

    if is_list(groups) and Enum.all?(groups, &match?(%ExerciseGroup{exercises: [_ | _]}, &1)),
      do: changeset,
      else: add_error(changeset, :groups, "must contain only nonempty exercise groups")
  end

  @spec for_owner(Ecto.Queryable.t(), String.t(), String.t() | nil) :: Ecto.Query.t()
  def for_owner(query \\ __MODULE__, business_id, client_id)

  def for_owner(query, business_id, nil),
    do: from(w in query, where: w.business_id == ^business_id and is_nil(w.client_id))

  def for_owner(query, business_id, client_id),
    do: from(w in query, where: w.business_id == ^business_id and w.client_id == ^client_id)

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__), do: from(w in query, where: is_nil(w.archived_at))

  @spec include_content(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_content(query \\ __MODULE__, business_id) do
    videos = from(a in Easy.Attachments.Attachment, where: a.business_id == ^business_id)
    from(w in query, preload: [video: ^videos])
  end
end
