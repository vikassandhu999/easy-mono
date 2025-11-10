defmodule Easy.MealPlans do
  @moduledoc """
  MealPlans context handles meal plan and meal plan meal management.

  This is the public API for:
  - Meal plan CRUD operations
  - Meal plan assignment to clients
  - Meal plan meal management
  - Publishing and archiving meal plans

  All resources are scoped to business context for data isolation.
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.MealPlans.{Plan, MealPlanMeal}
  alias Easy.Coaches.Coach

  # ============================================
  # MEAL PLAN MANAGEMENT
  # ============================================

  def create_plan(business_id, coach_id, attrs) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, business_id) do
      attrs_with_ids =
        attrs
        |> Map.put(:business_id, business_id)
        |> Map.put(:created_by_id, coach_id)

      Plan.create_changeset(attrs_with_ids)
      |> Repo.insert()
    end
  end

  def get_plan(id), do: Repo.get(Plan, id)

  def get_plan_with_meals(id) do
    Plan
    |> where([p], p.id == ^id)
    |> preload(meal_plan_meals: [:meal])
    |> Repo.one()
  end

  def list_plans(business_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    status = Keyword.get(opts, :status, "draft")
    assigned_to_id = Keyword.get(opts, :assigned_to_id)
    template_only = Keyword.get(opts, :template_only, false)

    query =
      from p in Plan,
        where: p.business_id == ^business_id,
        where: p.status == ^status,
        order_by: [desc: p.inserted_at],
        limit: ^limit,
        offset: ^offset

    query =
      if template_only do
        where(query, [p], is_nil(p.assigned_to_id))
      else
        query
      end

    query =
      if assigned_to_id do
        where(query, [p], p.assigned_to_id == ^assigned_to_id)
      else
        query
      end

    Repo.all(query)
  end

  def update_plan(plan, attrs) do
    plan
    |> Plan.update_changeset(attrs)
    |> Repo.update()
  end

  def delete_plan(plan) do
    Repo.delete(plan)
  end

  def publish_plan(plan) do
    plan
    |> Plan.publish_changeset()
    |> Repo.update()
  end

  def archive_plan(plan) do
    plan
    |> Plan.archive_changeset()
    |> Repo.update()
  end

  def assign_to_client(plan, client_id, attrs \\ %{}) do
    plan
    |> Plan.assign_to_client_changeset(client_id, attrs)
    |> Repo.update()
  end

  def duplicate_plan(plan, coach_id, attrs \\ %{}) do
    with {:ok, _coach} <- validate_coach_in_business(coach_id, plan.business_id) do
      new_attrs =
        %{
          name: attrs[:name] || "#{plan.name} (Copy)",
          description: plan.description,
          cover_image_url: plan.cover_image_url,
          status: "draft",
          business_id: plan.business_id,
          created_by_id: coach_id
        }
        |> Map.merge(Map.take(attrs, [:name, :description, :cover_image_url]))

      case create_plan(plan.business_id, coach_id, new_attrs) do
        {:ok, new_plan} ->
          duplicate_plan_meals(plan.id, new_plan.id)
          {:ok, new_plan}

        error ->
          error
      end
    end
  end

  defp duplicate_plan_meals(source_plan_id, target_plan_id) do
    meals =
      from(m in MealPlanMeal,
        where: m.meal_plan_id == ^source_plan_id,
        select: m
      )
      |> Repo.all()

    Enum.each(meals, fn meal ->
      MealPlanMeal.create_changeset(%{
        meal_plan_id: target_plan_id,
        meal_id: meal.meal_id,
        day_offset: meal.day_offset,
        label: meal.label,
        meal_time_window_start: meal.meal_time_window_start,
        meal_time_window_end: meal.meal_time_window_end
      })
      |> Repo.insert()
    end)
  end

  # ============================================
  # MEAL PLAN MEAL MANAGEMENT
  # ============================================

  def add_meal_to_plan(plan_id, attrs) do
    attrs_with_plan_id = Map.put(attrs, :meal_plan_id, plan_id)

    MealPlanMeal.create_changeset(attrs_with_plan_id)
    |> Repo.insert()
  end

  def get_plan_meal(id), do: Repo.get(MealPlanMeal, id)

  def list_plan_meals(plan_id) do
    from(m in MealPlanMeal,
      where: m.meal_plan_id == ^plan_id,
      order_by: [asc: m.day_offset, asc: m.meal_time_window_start],
      preload: [:meal]
    )
    |> Repo.all()
  end

  def update_plan_meal(plan_meal, attrs) do
    plan_meal
    |> MealPlanMeal.update_changeset(attrs)
    |> Repo.update()
  end

  def delete_plan_meal(plan_meal) do
    Repo.delete(plan_meal)
  end

  # ============================================
  # AUTHORIZATION HELPERS
  # ============================================

  defp validate_coach_in_business(coach_id, business_id) do
    case Repo.get(Coach, coach_id) do
      nil ->
        {:error, :unauthorized}

      coach ->
        if coach.business_id == business_id do
          {:ok, coach}
        else
          {:error, :unauthorized}
        end
    end
  end
end
