defmodule Easy.Workouts.WorkoutSchedule do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  import Bitwise, only: [band: 2, bsl: 2]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "workout_schedules" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:client, Easy.Clients.Client)
    belongs_to(:workout, Easy.Workouts.Workout)
    belongs_to(:coach, Easy.Orgs.Coach)

    field(:weekdays_mask, :integer)
    field(:from_date, :date)
    field(:until_date, :date)

    field(:time, :time)
    field(:place, :string)
    field(:meeting_url, :string)
    field(:claimed_today, :boolean, virtual: true, default: false)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map(), Date.t()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, workout_id, attrs, %Date{} = today) do
    %__MODULE__{}
    |> change(
      business_id: business_id,
      client_id: client_id,
      workout_id: workout_id,
      from_date: today
    )
    |> update_changeset(attrs)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(schedule, attrs) do
    schedule
    |> cast(
      attrs,
      [:weekdays_mask, :from_date, :until_date, :time, :place, :meeting_url, :coach_id],
      empty_values: []
    )
    |> update_change(:place, &optional_text/1)
    |> update_change(:meeting_url, &optional_text/1)
    |> validate_required([:business_id, :client_id, :workout_id, :weekdays_mask, :from_date])
    |> validate_reference_ids()
    |> validate_weekdays()
    |> validate_date_window()
    |> validate_location()
    |> validate_meeting_url()
    |> database_constraints()
  end

  defp optional_text(nil), do: nil

  defp optional_text(value) do
    case String.trim(value) do
      "" -> nil
      text -> text
    end
  end

  defp validate_reference_ids(changeset) do
    Enum.reduce([:business_id, :client_id, :workout_id, :coach_id], changeset, &validate_reference_id(&2, &1))
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

  defp validate_weekdays(changeset) do
    case get_field(changeset, :weekdays_mask) do
      nil ->
        changeset

      mask when is_integer(mask) and mask in 1..127 ->
        changeset

      _ ->
        add_error(
          changeset,
          :weekdays_mask,
          "must select at least one weekday using a mask from 1 to 127"
        )
    end
  end

  defp validate_date_window(changeset) do
    case {get_field(changeset, :from_date), get_field(changeset, :until_date)} do
      {%Date{} = first, %Date{} = last} ->
        days = Date.diff(last, first)
        mask = get_field(changeset, :weekdays_mask)

        cond do
          days < 0 ->
            add_error(changeset, :until_date, "must be on or after the start date")

          is_integer(mask) and mask in 1..127 and not matching_weekday?(first, days, mask) ->
            add_error(changeset, :weekdays_mask, "Select a weekday within the date range.")

          true ->
            changeset
        end

      _ ->
        changeset
    end
  end

  defp matching_weekday?(first, days, mask) do
    first_weekday = Date.day_of_week(first) - 1

    Enum.any?(0..min(days, 6), fn offset ->
      band(mask, bsl(1, rem(first_weekday + offset, 7))) != 0
    end)
  end

  defp validate_location(changeset) do
    if get_field(changeset, :place) && get_field(changeset, :meeting_url),
      do: add_error(changeset, :meeting_url, "choose a place or meeting link"),
      else: changeset
  end

  defp validate_meeting_url(changeset) do
    case get_field(changeset, :meeting_url) do
      nil ->
        changeset

      url ->
        case URI.new(url) do
          {:ok, %URI{scheme: scheme, host: host}}
          when scheme in ["http", "https"] and is_binary(host) and host != "" ->
            changeset

          _ ->
            add_error(changeset, :meeting_url, "must be a full HTTP or HTTPS URL with a host")
        end
    end
  end

  defp database_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :workout_schedules_client_id_business_id_fkey)
    |> foreign_key_constraint(:workout_id,
      name: :workout_schedules_workout_id_client_id_business_id_fkey
    )
    |> foreign_key_constraint(:coach_id, name: :workout_schedules_coach_id_business_id_fkey)
    |> check_constraint(:weekdays_mask, name: :workout_schedules_values)
    |> check_constraint(:weekdays_mask, name: :workout_schedules_matching_weekday)
    |> check_constraint(:meeting_url, name: :workout_schedules_meeting_url_valid)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(s in query, where: s.business_id == ^business_id and s.client_id == ^client_id)
end
