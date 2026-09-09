defmodule Easy.Forms.SubmissionLookupTest do
  use Easy.SchemaCase

  alias Easy.Forms.Submissions

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach)
    template = insert(:form_template, business: coach.business)
    assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
    submission = insert(:form_submission, business: coach.business, client: client, form_assignment: assignment)

    %{coach: coach, client: client, template: template, assignment: assignment, submission: submission}
  end

  test "loads a visible client's submission with its assignment and template", context do
    %{coach: coach, client: client, submission: submission, assignment: assignment, template: template} = context

    assert {:ok, loaded} = Submissions.get_for_client(trainer_ctx(coach), client.id, submission.id)
    assert loaded.id == submission.id
    assert loaded.form_assignment.id == assignment.id
    assert loaded.form_assignment.form_template.id == template.id
    assert loaded.form_assignment.form_template.name == template.name
  end

  test "rejects missing submissions and submissions belonging to another client", context do
    %{coach: coach, client: client, submission: submission} = context
    other_client = insert(:client, business: coach.business, creator: coach)
    ctx = trainer_ctx(coach)

    assert {:error, :not_found} = Submissions.get_for_client(ctx, client.id, Ecto.UUID.generate())
    assert {:error, :not_found} = Submissions.get_for_client(ctx, other_client.id, submission.id)
  end

  test "rejects coaches without visibility and callers from another business", context do
    %{coach: coach, client: client, submission: submission} = context
    teammate = insert(:coach, business: coach.business)
    outsider = insert(:coach)

    for denied_coach <- [teammate, outsider] do
      assert {:error, :not_found} =
               Submissions.get_for_client(trainer_ctx(denied_coach), client.id, submission.id)
    end
  end
end
