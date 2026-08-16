defmodule EasyWeb.Coaches.NutritionPlanJSON do
  alias Easy.Clients.Client
  alias Easy.Nutrition.{DayPattern, Plan, WeekSchedule}

  @spec show(map()) :: map()
  def show(%{plan: plan}) do
    %{data: data(plan)}
  end

  @spec index(map()) :: map()
  def index(%{plans: plans, count: count}) do
    %{data: Enum.map(plans, &data/1), count: count}
  end

  defp data(%Plan{} = plan) do
    %{
      id: plan.id,
      kind: plan.kind,
      name: plan.name,
      description: plan.description,
      revision: plan.revision,
      archived_at: plan.archived_at,
      status: if(plan.archived_at, do: :archived, else: :active),
      lifecycle: Plan.lifecycle(plan),
      assigned_client_count: plan.assigned_client_count || 0,
      target_calories: plan.target_calories,
      target_protein_g: plan.target_protein_g,
      target_carbs_g: plan.target_carbs_g,
      target_fat_g: plan.target_fat_g,
      target_fiber_g: plan.target_fiber_g,
      start_date: plan.start_date,
      end_date: plan.end_date,
      client_id: plan.client_id,
      client: client_data(plan.client),
      creator_id: plan.creator_id,
      source_template_id: plan.source_template_id,
      day_patterns: day_patterns_data(plan.day_patterns, plan.week_schedule),
      schedule: schedule_data(plan.week_schedule),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp day_patterns_data(patterns, schedule) when is_list(patterns) and is_list(schedule),
    do: Enum.map(patterns, &day_pattern_data(&1, schedule))

  defp day_patterns_data(_, _), do: []

  defp schedule_data(schedule) when is_list(schedule) do
    scheduled =
      Map.new(schedule, fn %WeekSchedule{} = row ->
        {Atom.to_string(row.weekday), row.nutrition_day_pattern_id}
      end)

    Map.new(WeekSchedule.weekdays(), fn weekday -> {Atom.to_string(weekday), scheduled[Atom.to_string(weekday)]} end)
  end

  defp schedule_data(_), do: Map.new(WeekSchedule.weekdays(), &{Atom.to_string(&1), nil})

  defp day_pattern_data(%DayPattern{} = pattern, schedule) do
    %{
      id: pattern.id,
      name: pattern.name,
      position: pattern.position,
      weekdays: DayPattern.weekdays_for(pattern, schedule),
      nutrition_plan_id: pattern.nutrition_plan_id,
      inserted_at: pattern.inserted_at,
      updated_at: pattern.updated_at
    }
  end

  defp client_data(%Client{} = client) do
    %{id: client.id, first_name: client.first_name, last_name: client.last_name}
  end

  defp client_data(_), do: nil
end
