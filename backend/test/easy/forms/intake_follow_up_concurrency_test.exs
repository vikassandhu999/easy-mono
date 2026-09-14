defmodule Easy.Forms.IntakeFollowUpConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.{Assignments, FormAssignment, FormSubmission, FormTemplate, Submissions}
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    suffix = System.unique_integer([:positive])
    owner = insert_user("owner-#{suffix}@example.com")
    business = insert_business(owner, suffix)
    coach = insert_coach(business, owner)
    client_user = insert_user("client-#{suffix}@example.com")
    client = insert_client(business, coach, client_user)
    template = insert_intake_template(business, suffix)
    assignment = insert_intake_assignment(business, client, template)

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business, coach, client, template, assignment, [owner, client_user])
    end)

    %{
      assignment: assignment,
      business: business,
      client_ctx: %Ctx{business_id: business.id, user_id: client_user.id, client_id: client.id},
      coach_ctx: Ctx.new(business.id, owner.id, coach.id, true)
    }
  end

  test "concurrent client submission and coach dismissal produce one terminal assignment state", ctx do
    parent = self()

    submit_task =
      Task.async(fn ->
        checked_task(parent, :submit, fn ->
          Submissions.submit_client_assignment(ctx.client_ctx, ctx.assignment.id, %{
            answers: %{"meal_prep_ability" => "high"}
          })
        end)
      end)

    dismiss_task =
      Task.async(fn ->
        checked_task(parent, :dismiss, fn ->
          Assignments.update_form_assignment(ctx.coach_ctx, ctx.assignment.id, %{
            "expected_status" => "assigned",
            "status" => "dismissed"
          })
        end)
      end)

    release_workers(2)
    submit_result = Task.await(submit_task, 5_000)
    dismiss_result = Task.await(dismiss_task, 5_000)

    assignment = Repo.get!(FormAssignment, ctx.assignment.id)
    submissions = Repo.all(FormSubmission.for_assignment(ctx.business.id, ctx.assignment.id))

    case {submit_result, dismiss_result, assignment.status, submissions} do
      {{:ok, submitted}, {:error, :assignment_changed}, :completed, [stored]} ->
        assert submitted.answers == %{"meal_prep_ability" => "high"}
        assert stored.answers == submitted.answers

      {{:error, :assignment_not_submittable}, {:ok, %FormAssignment{}}, :dismissed, []} ->
        :ok

      outcome ->
        flunk("unexpected submit-vs-dismiss outcome: #{inspect(outcome)}")
    end
  end

  defp checked_task(parent, tag, operation) do
    Sandbox.checkout(Repo, sandbox: false)
    send(parent, {:ready, tag, self()})

    receive do
      :go -> operation.()
    end
  end

  defp release_workers(count) do
    workers =
      for _ <- 1..count do
        assert_receive {:ready, _tag, pid}, 1_000
        pid
      end

    Enum.each(workers, &send(&1, :go))
  end

  defp insert_user(email) do
    User.insert_changeset(nil, %{email: email, first_name: "Test", last_name: "User"})
    |> Repo.insert!()
  end

  defp insert_business(owner, suffix) do
    Business.insert_changeset(owner.id, %{
      name: "Intake #{suffix}",
      handle: "intake-#{suffix}",
      default_weight_unit: :kg
    })
    |> Repo.insert!()
  end

  defp insert_coach(business, owner) do
    business.id
    |> Coach.insert_changeset(owner.id, %{first_name: "Test", last_name: "Coach"})
    |> Repo.insert!()
  end

  defp insert_client(business, coach, user) do
    Client.invite_changeset(business.id, coach.id, DateTime.utc_now(:second), %{
      email: user.email,
      first_name: "Test",
      last_name: "Client"
    })
    |> put_change(:user_id, user.id)
    |> put_change(:status, :active)
    |> Repo.insert!()
  end

  defp insert_intake_template(business, suffix) do
    business.id
    |> FormTemplate.insert_changeset(%{
      name: "Intake #{suffix}",
      purpose: :intake,
      status: :active,
      sections: [
        %{
          "questions" => [
            %{
              "id" => "meal_prep_ability",
              "label" => "Meal prep ability",
              "type" => "select",
              "required" => true,
              "options" => ["low", "medium", "high"]
            }
          ]
        }
      ]
    })
    |> Repo.insert!()
  end

  defp insert_intake_assignment(business, client, template) do
    business.id
    |> FormAssignment.insert_changeset(client.id, template.id, :intake, %{})
    |> Repo.insert!()
  end

  defp cleanup(business, coach, client, template, assignment, users) do
    Repo.delete_all(FormSubmission.for_assignment(business.id, assignment.id))
    Repo.delete_all(from a in FormAssignment, where: a.id == ^assignment.id)
    Repo.delete_all(from t in FormTemplate, where: t.id == ^template.id)
    Repo.delete_all(from c in Client, where: c.id == ^client.id)
    Repo.delete_all(from c in Coach, where: c.id == ^coach.id)
    Repo.delete_all(from b in Business, where: b.id == ^business.id)
    Repo.delete_all(from u in User, where: u.id in ^Enum.map(users, & &1.id))
  end
end
