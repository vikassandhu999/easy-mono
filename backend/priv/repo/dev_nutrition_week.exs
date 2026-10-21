unless Mix.env() == :dev, do: raise("Development fixtures only")

Code.eval_file(Path.join(__DIR__, "seeds/food_seeds.exs"))

defmodule Easy.Repo.Seeds.NutritionWeek do
  import Ecto.Query

  alias Easy.Billing.BusinessBilling
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Identity.User
  alias Easy.Nutrition.{NutritionPreset, NutritionSchedule, NutritionTargets, TargetSchedule}
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Easy.Repo.Seeds.Foods

  @spec reset() :: :ok
  def reset do
    handles = ["nutrition-week-375", "nutrition-week-1280"]
    business_ids = Repo.all(from(b in Business, where: b.handle in ^handles, select: b.id))

    {:ok, :ok} =
      Repo.transaction(fn ->
        Enum.each([TargetSchedule, NutritionTargets, NutritionSchedule, NutritionPreset], fn schema ->
          Repo.delete_all(from(row in schema, where: row.business_id in ^business_ids))
        end)
      end)

    :ok
  end

  @spec run(integer()) :: map()
  def run(width) do
    now = DateTime.utc_now(:second)
    email = "nutrition-coach-#{width}@example.test"
    owner = get_or_insert(User, %{email: email}, %{full_name: "Nutrition Coach", email_confirmed_at: now})
    business = get_or_insert(Business, %{handle: "nutrition-week-#{width}"}, %{name: "Nutrition week #{width}", timezone: "Etc/UTC", owner_user_id: owner.id})
    get_or_insert(BusinessBilling, %{business_id: business.id}, %{free_seats: 3})
    coach = get_or_insert(Coach, %{business_id: business.id, email: email}, %{user_id: owner.id, full_name: owner.full_name})
    client_user = get_or_insert(User, %{email: "nutrition-client-#{width}@example.test"}, %{full_name: "Alex", email_confirmed_at: now})

    client =
      get_or_insert(Client, %{business_id: business.id, email: client_user.email}, %{
        coach_id: coach.id,
        user_id: client_user.id,
        full_name: "Alex",
        preferred_name: "Alex",
        unit_system: :metric
      })

    get_or_insert(CoachingTerm, %{client_id: client.id}, %{starts_on: Date.add(Date.utc_today(), -45)})
    foods = Foods.for_business(business)
    rows = seed_week(business, client, coach, foods)

    Map.merge(rows, %{coachEmail: email, clientId: client.id, foodName: "Banana", supplementName: "Vitamin D3 2000 IU", sharedMealName: "Breakfast", targetsName: "Training day"})
  end

  defp seed_week(business, client, coach, foods) do
    breakfast =
      meal(
        business,
        client,
        "Breakfast",
        "Cook the oats in the milk. Stir the whey in after cooking.",
        [
          {"Oats bowl", [{"Rolled oats", 60, "g"}, {"Milk, semi-skimmed", 200, "ml"}, {"Whey protein", 1, "scoop"}, {"Banana", 1, "medium banana"}]},
          {"Eggs on toast", [{"Egg", 3, "large egg"}, {"Wholegrain toast", 2, "slice"}]}
        ],
        foods
      )

    weekday = schedule(business, client, coach, breakfast, 31, ~T[08:00:00])
    weekend = schedule(business, client, coach, breakfast, 96, ~T[10:30:00])

    for {name, time, mask, options} <- [
          {"Lunch", ~T[13:00:00], 127, [{"Chicken rice bowl", [{"Chicken breast, cooked", 150, "g"}, {"Basmati rice, cooked", 1, "cup"}]}]},
          {"Snack", ~T[16:00:00], 31, [{nil, [{"Greek yogurt 2%", 1, "pot"}, {"Mixed berries", 80, "g"}]}, {nil, [{"Banana", 1, "medium banana"}]}]},
          {"Dinner", ~T[19:30:00], 127,
           [
             {"Salmon and potatoes", [{"Salmon fillet, baked", 1, "fillet"}, {"Potatoes, boiled", 250, "g"}]},
             {"Chicken rice bowl", [{"Chicken breast, cooked", 150, "g"}, {"Basmati rice, cooked", 1, "cup"}]}
           ]}
        ] do
      preset = meal(business, client, name, "", options, foods)
      schedule(business, client, coach, preset, mask, time)
    end

    for {name, amount, unit, time} <- [{"Creatine monohydrate", 5, "g", nil}, {"Vitamin D3 2000 IU", 1, "unit", ~T[08:00:00]}] do
      food = Map.fetch!(foods, name)

      preset =
        Repo.one(from(p in NutritionPreset, where: p.business_id == ^business.id and p.client_id == ^client.id and p.food_id == ^food.id and is_nil(p.archived_at))) ||
          business.id |> NutritionPreset.insert_changeset(client.id, %{type: :supplement, food_id: food.id, amount: amount, unit: unit}) |> Repo.insert!()

      schedule(business, client, coach, preset, 127, time)
    end

    for {name, targets, mask} <- [
          {"Training day", %{"energy_kcal" => %{min: 2500, max: 2700}, "protein_g" => %{min: 160}, "fat_g" => %{min: 60, max: 80}, "sodium_mg" => %{max: 2300}}, 21},
          {"Rest day", %{"energy_kcal" => %{min: 2200, max: 2200}, "protein_g" => %{min: 160}}, 106}
        ] do
      row =
        Repo.one(from(t in NutritionTargets, where: t.business_id == ^business.id and t.client_id == ^client.id and t.name == ^name and is_nil(t.archived_at))) ||
          business.id |> NutritionTargets.insert_changeset(client.id, %{name: name, targets: targets}) |> Repo.insert!()

      unless Repo.exists?(
               from(s in TargetSchedule, where: s.business_id == ^business.id and s.client_id == ^client.id and s.nutrition_targets_id == ^row.id and is_nil(s.until_date))
             ) do
        business.id |> TargetSchedule.insert_changeset(client.id, row.id, %{weekdays_mask: mask, from_date: Date.add(Date.utc_today(), -30)}) |> Repo.insert!()
      end
    end

    %{sharedScheduleWeekdaysId: weekday.id, sharedScheduleWeekendId: weekend.id}
  end

  defp meal(business, client, name, instructions, choices, foods) do
    options =
      choices
      |> Enum.with_index()
      |> Enum.map(fn {{label, items}, position} ->
        %{
          name: label,
          position: position,
          items:
            Enum.with_index(items) |> Enum.map(fn {{food, amount, unit}, position} -> %{food_id: Map.fetch!(foods, food).id, amount: amount, unit: unit, position: position} end)
        }
      end)

    Repo.one(from(p in NutritionPreset, where: p.business_id == ^business.id and p.client_id == ^client.id and p.name == ^name and is_nil(p.archived_at))) ||
      business.id |> NutritionPreset.insert_changeset(client.id, %{type: :meal, name: name, instructions: instructions, options: options}) |> Repo.insert!()
  end

  defp schedule(business, client, coach, preset, mask, time) do
    Repo.one(
      from(s in NutritionSchedule,
        where: s.business_id == ^business.id and s.client_id == ^client.id and s.nutrition_preset_id == ^preset.id and s.weekdays_mask == ^mask and is_nil(s.until_date)
      )
    ) ||
      business.id
      |> NutritionSchedule.insert_changeset(client.id, preset.id, %{weekdays_mask: mask, from_date: Date.add(Date.utc_today(), -30), time: time})
      |> Ecto.Changeset.put_change(:coach_id, coach.id)
      |> Repo.insert!()
  end

  defp get_or_insert(schema, identity, attrs) do
    Repo.get_by(schema, identity) || Repo.insert!(struct(schema, Map.merge(identity, attrs)))
  end
end

if "--reset" in System.argv(), do: Easy.Repo.Seeds.NutritionWeek.reset()
fixtures = Map.new([375, 1280], fn width -> {to_string(width), Easy.Repo.Seeds.NutritionWeek.run(width)} end)
destination = Path.expand("../../../.scratch/nutrition/browser-fixtures.json", __DIR__)
File.write!(destination, Jason.encode!(fixtures, pretty: true))
IO.puts("Nutrition week fixtures saved to #{destination}")
