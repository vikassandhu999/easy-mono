defmodule Easy.Training.Programming.Phase do
  use Easy.Training.Schema

  alias Easy.Training.Programming.{TrainingPlan, PlannedWorkout, PhaseAssignment}

  schema "phases" do
    field :name, :string
    field :description, :string
    field :goal, :string
    field :position, :integer, default: 0

    belongs_to :training_plan, TrainingPlan

    has_many :planned_workouts, PlannedWorkout, preload_order: [asc: :day_of_week]
    has_many :phase_assignments, PhaseAssignment

    timestamps()
  end

  @doc false
  def changeset(phase, attrs) do
    phase
    |> cast(attrs, [:name, :description, :goal, :position, :training_plan_id])
    |> validate_required([:name, :training_plan_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:training_plan_id)
  end
end
