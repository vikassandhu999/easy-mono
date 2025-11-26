defmodule Easy.Training.Programming.PhaseAssignment do
  use Easy.Training.Schema

  alias Easy.Training.Programming.{TrainingPlan, Phase}

  schema "phase_assignments" do
    field :start_week, :integer
    field :end_week, :integer

    belongs_to :training_plan, TrainingPlan
    belongs_to :phase, Phase

    timestamps()
  end

  @doc false
  def changeset(phase_assignment, attrs) do
    phase_assignment
    |> cast(attrs, [:start_week, :end_week, :training_plan_id, :phase_id])
    |> validate_required([:start_week, :end_week, :training_plan_id, :phase_id])
    |> validate_number(:start_week, greater_than: 0)
    |> validate_number(:end_week, greater_than: 0)
    |> validate_week_range()
    |> foreign_key_constraint(:training_plan_id)
    |> foreign_key_constraint(:phase_id)
  end

  defp validate_week_range(changeset) do
    start_week = get_field(changeset, :start_week)
    end_week = get_field(changeset, :end_week)

    if start_week && end_week && end_week < start_week do
      add_error(changeset, :end_week, "must be greater than or equal to start_week")
    else
      changeset
    end
  end
end
