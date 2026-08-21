defmodule Easy.Nutrition.LibraryConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Nutrition.{MealItem, Plan, Programming, Recipe, WeekSchedule}
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    business = insert(:business)
    coach = insert(:coach, business: business)
    ctx = %Ctx{business_id: business.id, user_id: coach.user_id, coach_id: coach.id}
    user_ids = Enum.uniq([business.owner_id, coach.user_id])

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(from(plan in Plan, where: plan.business_id == ^business.id))
      Repo.delete_all(from(recipe in Recipe, where: recipe.business_id == ^business.id))
      Repo.delete_all(from(coach in Coach, where: coach.business_id == ^business.id))
      Repo.delete_all(from(business in Business, where: business.id == ^business.id))
      Repo.delete_all(from(user in User, where: user.id in ^user_ids))
    end)

    %{business: business, coach: coach, ctx: ctx}
  end

  test "Menu replacement waits for the Recipe row before resolving a gram Portion", ctx do
    {:ok, template} = Programming.create_template(ctx.ctx, %{name: "Cut"})
    pattern = hd(template.day_patterns)

    recipe =
      insert(:recipe,
        business: ctx.business,
        creator: ctx.coach,
        cooked_weight_g: 400.0,
        servings_count: 2
      )

    parent = self()

    locker =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        Repo.transaction(fn ->
          locked =
            Recipe |> where([row], row.id == ^recipe.id) |> lock("FOR UPDATE") |> Repo.one!()

          send(parent, :recipe_locked)

          receive do
            :remove_weight ->
              locked |> Ecto.Changeset.change(%{cooked_weight_g: nil}) |> Repo.update!()
          end
        end)
      end)

    assert_receive :recipe_locked

    replacement =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        Programming.replace_menu(ctx.ctx, template.id, 1, %{
          meals: [
            %{
              local_ref: "meal",
              name: "Meal",
              position: 0,
              meal_items: [
                %{
                  local_ref: "item",
                  kind: :recipe,
                  recipe_id: recipe.id,
                  position: 0,
                  portion: %{kind: :gram, grams: 50.0}
                }
              ]
            }
          ],
          day_patterns: [%{id: pattern.id, name: pattern.name, position: 0, slots: []}],
          schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
        })
      end)

    assert Task.yield(replacement, 200) == nil
    send(locker.pid, :remove_weight)
    assert {:ok, _} = Task.await(locker)
    assert {:error, %Ecto.Changeset{valid?: false}} = Task.await(replacement)
    refute Repo.exists?(from(item in MealItem, where: item.recipe_id == ^recipe.id))
  end
end
