defmodule Easy.Nutrition.LibraryConcurrencyTest do
  import Easy.Nutrition.ProgrammingMenuFixtures, only: [uuid: 1]
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Nutrition.{Diary, DiaryDay, DiarySlot, Food, Library, Menu, Plan, Programming, Recipe}
  alias Easy.Nutrition.ProgrammingMenuFixtures
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    business = insert(:business)
    coach = insert(:coach, business: business)
    ctx = %Ctx{business_id: business.id, user_id: coach.user_id, coach_id: coach.id}
    client = insert(:client, business: business, creator: coach, timezone: "Etc/UTC")
    user_ids = Enum.uniq([business.owner_id, coach.user_id, client.user_id])

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(from(plan in Plan, where: plan.business_id == ^business.id))
      Repo.delete_all(from(recipe in Recipe, where: recipe.business_id == ^business.id))
      Repo.delete_all(from(food in Food, where: food.business_id == ^business.id))
      Repo.delete_all(from(client in Client, where: client.business_id == ^business.id))
      Repo.delete_all(from(coach in Coach, where: coach.business_id == ^business.id))
      Repo.delete_all(from(business in Business, where: business.id == ^business.id))
      Repo.delete_all(from(user in User, where: user.id in ^user_ids))
    end)

    %{business: business, coach: coach, ctx: ctx, client: client}
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
          :food -> fn -> Library.delete_food(c.ctx, source.id) end
          :recipe -> fn -> Library.delete_recipe(c.ctx, source.id) end
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

  test "a menu read retains one snapshot while another transaction removes and deletes its Food", c do
    food = insert(:food, business: c.business, creator: c.coach, calories_per_100g: 100.0)
    {:ok, plan} = Programming.create_template(c.ctx, %{name: "Live menu"})

    input =
      ProgrammingMenuFixtures.menu(plan,
        meals: [
          ProgrammingMenuFixtures.meal_input("meal", "Meal", [ProgrammingMenuFixtures.food_item("food", food.id, %{kind: :gram, grams: 100})])
        ]
      )

    {:ok, saved} = Programming.replace_menu(c.ctx, plan.id, plan.revision, input)
    reader = pause_read(fn -> Programming.get_template(c.ctx, plan.id) end, "nutrition_plans")
    {:ok, _} = Programming.replace_menu(c.ctx, plan.id, saved.revision, ProgrammingMenuFixtures.menu(plan, meals: []))
    {:ok, _} = Library.delete_food(c.ctx, food.id)
    send(reader.pid, :resume)
    assert {:ok, read} = Task.await(reader)
    assert hd(Menu.items(read.menu)).nutrients.calories == 100.0
    assert {:ok, current} = Programming.get_template(c.ctx, plan.id)
    assert Menu.items(current.menu) == []
  end

  test "recipe reads keep servings and ingredients from the same committed version", c do
    food = insert(:food, business: c.business, creator: c.coach, calories_per_100g: 100.0)

    {:ok, recipe} =
      Library.create_recipe(c.ctx, %{
        name: "Recipe",
        servings_count: 1,
        recipe_ingredients: [%{food_id: food.id, portion: %{kind: :gram, grams: 100}}]
      })

    reader = pause_read(fn -> Library.get_recipe(c.ctx, recipe.id) end, "nutrition_recipes")

    {:ok, _} =
      Library.update_recipe(c.ctx, recipe.id, recipe.revision, %{
        servings_count: 2,
        recipe_ingredients: [%{food_id: food.id, portion: %{kind: :gram, grams: 600}}]
      })

    send(reader.pid, :resume)
    assert {:ok, read} = Task.await(reader)
    assert Library.recipe_nutrients(read).calories / read.servings_count == 100.0
    assert {:ok, current} = Library.get_recipe(c.ctx, recipe.id)
    assert Library.recipe_nutrients(current).calories / current.servings_count == 300.0
  end

  test "Diary freezes a complete Recipe version while the coach edits its ingredients", c do
    food = insert(:food, business: c.business, creator: c.coach, calories_per_100g: 100.0)

    {:ok, recipe} =
      Library.create_recipe(c.ctx, %{
        name: "Recipe",
        servings_count: 1,
        recipe_ingredients: [%{food_id: food.id, portion: %{kind: :gram, grams: 100}}]
      })

    ctx = %Ctx{business_id: c.business.id, user_id: c.client.user_id, client_id: c.client.id}
    draft = diary_recipe_draft(recipe, :breakfast)
    save = pause_read(fn -> Diary.save_client_nutrition_day(ctx, Date.utc_today(), %{slots: [draft]}) end, "nutrition_recipes")

    assert {:ok, _} =
             Library.update_recipe(c.ctx, recipe.id, recipe.revision, %{
               servings_count: 2,
               recipe_ingredients: [%{food_id: food.id, portion: %{kind: :gram, grams: 600}}]
             })

    send(save.pid, :resume)
    assert {:ok, day} = Task.await(save)
    assert day.summary.logged.calories == 100.0
    assert {:ok, reread} = Diary.get_client_nutrition_day(ctx, Date.utc_today())
    assert reread.summary.logged.calories == 100.0
  end

  test "a concurrent first Diary day save rolls back completely and can be retried", c do
    recipe = insert(:recipe, business: c.business, creator: c.coach)
    ctx = %Ctx{business_id: c.business.id, user_id: c.client.user_id, client_id: c.client.id}
    breakfast = diary_recipe_draft(recipe, :breakfast)
    lunch = diary_recipe_draft(recipe, :lunch)
    first = pause_read(fn -> Diary.save_client_nutrition_day(ctx, Date.utc_today(), %{slots: [breakfast]}) end, "nutrition_recipes")
    second = start_operation(fn -> Diary.save_client_nutrition_day(ctx, Date.utc_today(), %{slots: [lunch]}) end)
    assert_waiting_for_lock(second)
    send(first.pid, :resume)
    assert {:ok, _} = Task.await(first)
    assert {:error, :conflict} = Task.await(second)
    assert [%{meal_slot: :breakfast, revision: 1}] = Repo.all(from s in DiarySlot, where: s.client_id == ^c.client.id)
    assert 1 == Repo.aggregate(from(d in DiaryDay, where: d.client_id == ^c.client.id), :count)
    assert {:ok, retried} = Diary.save_client_nutrition_day(ctx, Date.utc_today(), %{slots: [lunch]})
    assert Enum.map(retried.slots, &{&1.meal_slot, &1.revision}) == [breakfast: 1, lunch: 1]
  end

  defp diary_recipe_draft(recipe, meal_slot) do
    %{
      meal_slot: meal_slot,
      meal_id: nil,
      expected_revision: 0,
      entries: [
        %{id: Ecto.UUID.generate(), planned_item_ref: nil, food_id: nil, recipe_id: recipe.id, portion: %{kind: :serving, amount: 1.0, unit: "serving", label: nil}, notes: nil}
      ]
    }
  end

  defp pause_read(operation, table) do
    parent = self()

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        receive do
          :read -> operation.()
        end
      end)

    handler = {__MODULE__, task.pid}

    :telemetry.attach(
      handler,
      [:easy, :repo, :query],
      fn _, _, metadata, _ ->
        if self() == task.pid and String.contains?(metadata.query, "FROM \"#{table}\"") and not Process.get(handler, false) do
          Process.put(handler, true)
          send(parent, {:read_paused, self()})

          receive do
            :resume -> :ok
          after
            5_000 -> raise "snapshot reader was not released"
          end
        end
      end,
      nil
    )

    on_exit(fn -> :telemetry.detach(handler) end)
    send(task.pid, :read)
    pid = task.pid
    assert_receive {:read_paused, ^pid}, 2_000
    task
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
