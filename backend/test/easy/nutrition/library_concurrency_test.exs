defmodule Easy.Nutrition.LibraryConcurrencyTest do
  import Easy.Nutrition.ProgrammingMenuFixtures, only: [uuid: 1]
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Nutrition.{Food, Library, Menu, Plan, Programming, Recipe}
  alias Easy.Nutrition.ProgrammingMenuFixtures
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
      Repo.delete_all(from(food in Food, where: food.business_id == ^business.id))
      Repo.delete_all(from(coach in Coach, where: coach.business_id == ^business.id))
      Repo.delete_all(from(business in Business, where: business.id == ^business.id))
      Repo.delete_all(from(user in User, where: user.id in ^user_ids))
    end)

    %{business: business, coach: coach, ctx: ctx}
  end

  test "Menu replacement waits for the Recipe row before resolving a gram Portion", ctx do
    {:ok, template} = Programming.create_template(ctx.ctx, %{name: "Cut"})
    pattern = hd(template.menu.day_patterns)

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
              id: uuid("meal"),
              name: "Meal",
              meal_items: [
                %{
                  id: uuid("item"),
                  kind: :recipe,
                  recipe_id: recipe.id,
                  portion: %{kind: :gram, grams: 50.0}
                }
              ]
            }
          ],
          day_patterns: [%{id: pattern.id, name: pattern.name, slots: []}],
          schedule: Map.new(Menu.weekdays(), &{&1, pattern.id})
        })
      end)

    assert Task.yield(replacement, 200) == nil
    send(locker.pid, :remove_weight)
    assert {:ok, _} = Task.await(locker)
    assert {:error, %Ecto.Changeset{valid?: false}} = Task.await(replacement)
    assert Repo.get!(Plan, template.id).menu.meals == []
  end

  for kind <- [:food, :recipe], first <- [:save, :delete] do
    @kind kind
    @first first
    test "#{kind} deletion and menu Save are safe when #{first} commits first", c do
      source = insert(@kind, business: c.business, creator: c.coach)
      {:ok, plan} = Programming.create_template(c.ctx, %{name: "Concurrent menu"})

      item =
        case @kind do
          :food -> %{id: uuid("item"), kind: :food, food_id: source.id, portion: %{kind: :gram, grams: 50}}
          :recipe -> %{id: uuid("item"), kind: :recipe, recipe_id: source.id, portion: %{kind: :serving, amount: 1, unit: "serving", label: nil}}
        end

      input = ProgrammingMenuFixtures.menu(plan, meals: [ProgrammingMenuFixtures.meal_input("meal", "Meal", [item])])
      save = fn -> Programming.replace_menu(c.ctx, plan.id, 1, input) end

      delete =
        case @kind do
          :food -> fn -> Library.delete_food(c.ctx, source.id, source.revision) end
          :recipe -> fn -> Library.delete_recipe(c.ctx, source.id, source.revision) end
        end

      {first_operation, second_operation} = if @first == :save, do: {save, delete}, else: {delete, save}
      held = hold_transaction(first_operation)
      blocked = start_operation(second_operation)
      assert_waiting_for_lock(blocked)
      send(held.pid, :commit)
      assert {:ok, _} = Task.await(held)
      expected = if @first == :save, do: :in_use, else: :not_found
      assert {:error, ^expected} = Task.await(blocked)
      assert Repo.get!(Plan, plan.id).menu.meals != [] == (@first == :save)
    end
  end

  test "cooked weight removal waits for a menu Save and then reports in use", c do
    recipe = insert(:recipe, business: c.business, creator: c.coach, cooked_weight_g: 400.0)
    {:ok, plan} = Programming.create_template(c.ctx, %{name: "Weighed"})
    item = ProgrammingMenuFixtures.recipe_item("item", recipe.id, %{kind: :gram, grams: 50})
    input = ProgrammingMenuFixtures.menu(plan, meals: [ProgrammingMenuFixtures.meal_input("meal", "Meal", [item])])
    held = hold_transaction(fn -> Programming.replace_menu(c.ctx, plan.id, 1, input) end)
    blocked = start_operation(fn -> Library.update_recipe(c.ctx, recipe.id, recipe.revision, %{cooked_weight_g: nil}) end)
    assert_waiting_for_lock(blocked)
    send(held.pid, :commit)
    assert {:ok, _} = Task.await(held)
    assert {:error, :in_use} = Task.await(blocked)
    assert Repo.get!(Recipe, recipe.id).cooked_weight_g == 400.0
  end

  test "recipe ingredient edits and menu Save use the same lock order", c do
    food = insert(:food, business: c.business, creator: c.coach, calories_per_100g: 123.0)
    recipe = insert(:recipe, business: c.business, creator: c.coach, servings_count: 1)
    {:ok, plan} = Programming.create_template(c.ctx, %{name: "Recipe"})
    item = ProgrammingMenuFixtures.recipe_item("item", recipe.id, %{kind: :serving, amount: 1, unit: "serving", label: nil})
    input = ProgrammingMenuFixtures.menu(plan, meals: [ProgrammingMenuFixtures.meal_input("meal", "Meal", [item])])

    held =
      hold_transaction(fn ->
        Library.update_recipe(c.ctx, recipe.id, recipe.revision, %{recipe_ingredients: [%{food_id: food.id, portion: %{kind: :gram, grams: 100}}]})
      end)

    blocked = start_operation(fn -> Programming.replace_menu(c.ctx, plan.id, 1, input) end)
    assert_waiting_for_lock(blocked)
    send(held.pid, :commit)
    assert {:ok, _} = Task.await(held)
    assert {:ok, saved} = Task.await(blocked)
    assert hd(Menu.items(saved.menu)).nutrients.calories == 123.0
  end

  defp hold_transaction(operation) do
    parent = self()

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        {:ok, result} =
          Repo.transaction(fn ->
            result = operation.()
            send(parent, {:held, self(), result})

            receive do
              :commit -> result
            after
              5_000 -> raise "transaction was not released"
            end
          end)

        result
      end)

    pid = task.pid
    assert_receive {:held, ^pid, {:ok, _}}, 2_000
    task
  end

  defp start_operation(operation) do
    parent = self()

    Task.async(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      [[backend_pid]] = Repo.query!("SELECT pg_backend_pid()").rows
      send(parent, {:backend_pid, self(), backend_pid})
      operation.()
    end)
  end

  defp assert_waiting_for_lock(task) do
    pid = task.pid
    assert_receive {:backend_pid, ^pid, backend_pid}, 2_000
    wait_for_lock(backend_pid, System.monotonic_time(:millisecond) + 2_000)
  end

  defp wait_for_lock(backend_pid, deadline) do
    [[waiting]] = Repo.query!("SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid = $1 AND NOT granted)", [backend_pid]).rows

    cond do
      waiting ->
        :ok

      System.monotonic_time(:millisecond) >= deadline ->
        flunk("operation did not wait for its Library lock")

      true ->
        Process.sleep(10)
        wait_for_lock(backend_pid, deadline)
    end
  end
end
