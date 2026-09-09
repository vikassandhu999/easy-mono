defmodule Easy.LandingEnrollmentConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias Easy.Billing.BusinessBilling
  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Forms.{FormAssignment, FormTemplate}
  alias Easy.Identity.User
  alias Easy.Landing
  alias Easy.Landing.{LandingPage, LandingProgram, Prospect}
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Prospects
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    user_id = Ecto.UUID.generate()
    business_id = Ecto.UUID.generate()

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)

      schemas = [Prospect, LandingProgram, LandingPage, FormAssignment, FormTemplate, Client, BusinessBilling, Coach]

      for schema <- schemas do
        Repo.delete_all(from row in schema, where: row.business_id == ^business_id)
      end

      Repo.delete_all(from b in Business, where: b.id == ^business_id)
      Repo.delete_all(from u in User, where: u.id == ^user_id)
    end)

    user =
      %{email: "enrollment-#{user_id}@example.test"}
      |> User.insert_changeset()
      |> Ecto.Changeset.put_change(:id, user_id)
      |> Repo.insert!()

    business =
      user.id
      |> Business.insert_changeset(%{name: "Enrollment test", handle: "enrollment-#{business_id}"})
      |> Ecto.Changeset.put_change(:id, business_id)
      |> Repo.insert!()

    {:ok, coach} = Coaches.create(user, business)
    ctx = Ctx.new(business.id, user.id, coach.id, true)

    {:ok, page} =
      Landing.upsert_landing_page(ctx, %{
        slug: "enrollment-#{business_id}",
        template: :proof_first,
        headline: "Enrollment test",
        status: :published
      })

    {:ok, %{prospect: prospect}} = Landing.submit_application(page.slug, %{name: "Phone prospect", phone: "1234567890"})
    %{ctx: ctx, prospect: prospect}
  end

  test "simultaneous enrollment creates one client and one intake", %{ctx: ctx, prospect: prospect} do
    parent = self()

    {:ok, contenders} =
      Repo.transaction(fn ->
        Prospect |> lock("FOR UPDATE") |> Repo.get!(prospect.id)

        contenders =
          for _ <- 1..2 do
            Task.async(fn ->
              Sandbox.checkout(Repo, sandbox: false)
              %{rows: [[backend_pid]]} = Repo.query!("SELECT pg_backend_pid()")
              send(parent, {:contender, backend_pid})
              Prospects.enroll_prospect(ctx, prospect.id, %{})
            end)
          end

        for _ <- contenders do
          assert_receive {:contender, backend_pid}, 1_000
          assert_blocked(backend_pid, 100)
        end

        contenders
      end)

    results = Enum.map(contenders, &Task.await(&1, 5_000))
    enrollments = Enum.map(results, fn {:ok, enrollment} -> enrollment end)
    assert Enum.sort(Enum.map(enrollments, & &1.already_enrolled)) == [false, true]
    assert enrollments |> Enum.map(& &1.client.id) |> Enum.uniq() |> length() == 1
    assert Repo.aggregate(Client.for_business(ctx.business_id), :count) == 1
    assert Repo.aggregate(FormAssignment.for_business(ctx.business_id), :count) == 1
  end

  defp assert_blocked(_backend_pid, 0), do: flunk("enrollment never waited on the prospect lock")

  defp assert_blocked(backend_pid, attempts) do
    case Repo.query!("SELECT cardinality(pg_blocking_pids($1)) > 0", [backend_pid]).rows do
      [[true]] ->
        :ok

      [[false]] ->
        Process.sleep(10)
        assert_blocked(backend_pid, attempts - 1)
    end
  end
end
