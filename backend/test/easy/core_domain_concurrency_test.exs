defmodule Easy.CoreDomainConcurrencyTest do
  use ExUnit.Case, async: false

  import Easy.Factory
  import Ecto.Query

  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Plans.Plan
  alias Easy.Plans.Programming
  alias Easy.Plans.Reader
  alias Easy.Plans.Template
  alias Easy.Repo
  alias Easy.Training.Content, as: TrainingContent
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    client = insert(:client, timezone: "Etc/UTC")

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(from(p in Plan, where: p.business_id == ^client.business_id))
      Repo.delete_all(from(t in Template, where: t.business_id == ^client.business_id))
      Repo.delete_all(CoachingTerm.for_business(client.business_id))
      Repo.delete!(client)
      Repo.delete!(client.coach)
      Repo.delete!(client.business)
      Repo.delete!(client.user)
      Repo.delete!(client.coach.user)
      Repo.delete!(client.business.owner)
    end)

    %{
      client: client,
      client_ctx: %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id},
      coach_ctx: Ctx.new(client.business_id, client.coach.user_id, client.coach_id, false)
    }
  end

  for domain <- [:training] do
    @domain domain
    test "#{domain}: two simultaneous publications with the same revision have one winner", f do
      content = TrainingContent.empty()
      assert {:ok, template} = Programming.create_template(f.coach_ctx, @domain, %{name: "Template", content: content})
      assert {:ok, plan} = Programming.assign_template_to_client(f.coach_ctx, f.client.id, @domain, template.id, %{})
      operations = for name <- ["First", "Second"], do: fn -> Programming.update_plan(f.coach_ctx, @domain, plan.id, 1, %{name: name, content: content}) end
      results = race(operations)
      assert [{:ok, winner}] = Enum.filter(results, &match?({:ok, _}, &1))
      assert [{:error, %Ecto.Changeset{action: :stale_revision, data: %{revision: 2}}}] = Enum.filter(results, &match?({:error, _}, &1))
      assert {:ok, saved} = Reader.get_plan(f.coach_ctx, @domain, plan.id)
      assert saved.name == winner.name
      assert saved.revision == 2
      assert saved.current_revision.number == 2
      assert Repo.query!("SELECT number FROM plan_revisions WHERE plan_id=$1 ORDER BY number", [Ecto.UUID.dump!(plan.id)]).rows == [[1], [2]]
    end
  end

  defp race(operations) do
    parent = self()

    tasks =
      Enum.map(operations, fn operation ->
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})
          receive do: (:go -> operation.())
        end)
      end)

    workers =
      for _ <- tasks do
        receive do
          {:ready, pid} -> pid
        after
          5000 -> flunk("concurrent writer did not become ready")
        end
      end

    Enum.each(workers, &send(&1, :go))
    Enum.map(tasks, &Task.await(&1, 5000))
  end
end
