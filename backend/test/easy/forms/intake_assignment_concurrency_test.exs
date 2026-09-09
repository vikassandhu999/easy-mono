defmodule Easy.Forms.IntakeAssignmentConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Billing.BusinessBilling
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.Assignments
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormTemplate
  alias Easy.Identity.User
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    client = insert(:client, business: business, creator: coach, assigned_coach: coach)
    templates = Enum.map(1..2, fn _ -> insert(:form_template, business: business, purpose: :intake) end)
    ctx = Ctx.new(business.id, business.owner_id, coach.id, true)

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business, coach, client)
    end)

    %{business: business, client: client, ctx: ctx, templates: templates}
  end

  test "concurrent Intake assignments create one row and return one conflict", %{
    business: business,
    client: client,
    ctx: ctx,
    templates: templates
  } do
    parent = self()

    tasks =
      Enum.map(templates, fn template ->
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:ready, self()})

          receive do
            :go -> :ok
          end

          Assignments.assign_form_template_to_client(ctx, client.id, template.id, %{})
        end)
      end)

    workers =
      for _ <- tasks do
        receive do
          {:ready, pid} -> pid
        end
      end

    Enum.each(workers, &send(&1, :go))
    results = Enum.map(tasks, &Task.await(&1, 5_000))

    assert Enum.count(results, &match?({:ok, %FormAssignment{}}, &1)) == 1
    assert Enum.count(results, &match?({:error, :conflict}, &1)) == 1

    count =
      FormAssignment
      |> FormAssignment.for_client(business.id, client.id)
      |> where([assignment], assignment.purpose == :intake)
      |> Repo.aggregate(:count, :id)

    assert count == 1
  end

  defp cleanup(business, coach, client) do
    Repo.delete_all(from a in FormAssignment, where: a.business_id == ^business.id)
    Repo.delete_all(from t in FormTemplate, where: t.business_id == ^business.id)
    Repo.delete_all(from c in Client, where: c.id == ^client.id)
    Repo.delete_all(from billing in BusinessBilling, where: billing.business_id == ^business.id)
    Repo.delete_all(from c in Coach, where: c.id == ^coach.id)
    Repo.delete_all(from b in Business, where: b.id == ^business.id)
    Repo.delete_all(from u in User, where: u.id in ^[business.owner_id, client.user_id])
  end
end
