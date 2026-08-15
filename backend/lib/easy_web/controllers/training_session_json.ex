defmodule EasyWeb.TrainingSessionJSON do
  alias Easy.Training.TrainingSession

  @spec legacy_snapshot(TrainingSession.t()) :: map() | nil
  def legacy_snapshot(%TrainingSession{planned_snapshot: snapshot}) when not is_nil(snapshot), do: snapshot

  def legacy_snapshot(%TrainingSession{prescription_snapshot: %{"workout" => workout}}) do
    %{
      "workout_name" => workout["name"],
      "exercises" =>
        Enum.map(workout["exercises"] || [], fn exercise ->
          %{
            "exercise_id" => exercise["exercise_id"],
            "name" => exercise["exercise_name"],
            "tracking_type" => exercise["tracking_type"],
            "position" => exercise["position"],
            "sets" => exercise["sets"]
          }
        end)
    }
  end

  def legacy_snapshot(%TrainingSession{}), do: nil
end
