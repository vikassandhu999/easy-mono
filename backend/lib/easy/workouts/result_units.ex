defmodule Easy.Workouts.ResultUnits do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:reps, Ecto.Enum, values: [:count, :reps])
    field(:weight, Ecto.Enum, values: [:kg, :lb])
    field(:duration, Ecto.Enum, values: [:s, :min, :"h:mm:ss"])
    field(:distance, Ecto.Enum, values: [:m, :km, :mi, :yd])
    field(:elevation_gain, Ecto.Enum, values: [:m, :ft])
    field(:height, Ecto.Enum, values: [:cm, :in])
    field(:calories, Ecto.Enum, values: [:kcal])
    field(:speed, Ecto.Enum, values: [:"m/s", :"km/h", :mph, :"min/km", :"min/mi", :"min/100m"])
    field(:incline, Ecto.Enum, values: [:%])
    field(:level, Ecto.Enum, values: [:level])
    field(:power, Ecto.Enum, values: [:W])
    field(:cadence, Ecto.Enum, values: [:rpm, :spm])
    field(:heart_rate, Ecto.Enum, values: [:bpm])
    field(:effort, Ecto.Enum, values: [:RPE])
    field(:reserve, Ecto.Enum, values: [:RIR])
    field(:successes, Ecto.Enum, values: [:count])
    field(:attempts, Ecto.Enum, values: [:count])
    field(:score, Ecto.Enum, values: [:points])
  end

  @spec changeset(t(), map(), [atom()]) :: Ecto.Changeset.t()
  def changeset(units, attrs, selected) do
    fields = __schema__(:fields)
    changeset = cast(units, attrs, fields, empty_values: [])
    unknown = Map.keys(changeset.params) -- Enum.map(fields, &Atom.to_string/1)

    changeset =
      Enum.reduce(unknown, changeset, fn key, acc ->
        add_error(acc, :base, "unsupported unit #{key}")
      end)

    Enum.reduce(changeset.changes, changeset, fn {key, value}, acc ->
      if value != nil and key not in selected,
        do: add_error(acc, key, "is not selected for this result"),
        else: acc
    end)
  end
end
