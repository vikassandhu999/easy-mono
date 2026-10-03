defmodule Easy.PlanCoverageConcurrencyTest do
  use ExUnit.Case, async: false

  import Easy.Factory
  import Ecto.Query

  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Nutrition.Plan
  alias Easy.Repo
  alias Easy.Training.TrainingPlan
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    client = insert(:client, timezone: "Etc/UTC")

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(Plan.for_business(client.business_id))
      Repo.delete_all(TrainingPlan.for_business(client.business_id))
      Repo.delete_all(CoachingTerm.for_business(client.business_id))
      Repo.delete!(client)
      Repo.delete!(client.coach)
      Repo.delete!(client.business)
      Repo.delete!(client.user)
      Repo.delete!(client.coach.user)
      Repo.delete!(client.business.owner)
    end)

    %{client: client}
  end

  for {factory, programming, schema} <- [
        {:training_plan, Easy.Training.Programming, TrainingPlan},
        {:plan, Easy.Nutrition.Programming, Plan}
      ] do
    @factory factory
    @programming programming
    @schema schema

    test "#{factory}: concurrent public assignments from distinct templates cannot overlap after coaching returns", %{client: client} do
      today = Date.utc_today()
      inserted_at = DateTime.new!(Date.add(today, -30), ~T[12:00:00], "Etc/UTC")
      insert(@factory, business: client.business, creator: client.coach.user, client: client, start_date: Date.add(today, -30), inserted_at: inserted_at)
      Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^client.id), set: [ends_on: Date.add(today, -1)])
      insert(:coaching_term, client_id: client.id, starts_on: today)
      templates = for _ <- 1..2, do: insert(@factory, business: client.business, creator: client.coach.user)
      ctx = Ctx.new(client.business_id, client.coach.user_id, client.coach_id, false)
      parent = self()

      tasks =
        for template <- templates do
          Task.async(fn ->
            Sandbox.checkout(Repo, sandbox: false)
            send(parent, {:ready, self()})

            receive do
              :go -> @programming.assign_template_to_client(ctx, client.id, template.id, %{start_date: today})
            end
          end)
        end

      workers =
        for _ <- tasks do
          receive do
            {:ready, pid} -> pid
          end
        end

      Enum.each(workers, &send(&1, :go))
      results = Enum.map(tasks, &Task.await(&1, 5_000))
      assert Enum.count(results, &match?({:ok, %{lifecycle: :current}}, &1)) == 1
      assert Enum.count(results, &match?({:error, %Ecto.Changeset{errors: [start_date: _]}}, &1)) == 1
      assert Repo.aggregate(from(p in @schema, where: p.client_id == ^client.id and p.start_date == ^today), :count) == 1
    end
  end
end
