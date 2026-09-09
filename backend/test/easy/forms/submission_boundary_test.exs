defmodule Easy.Forms.SubmissionBoundaryTest do
  use Easy.DataCase, async: true

  alias Easy.Ctx
  alias Easy.Forms.FormSubmission
  alias Easy.Forms.Submissions

  test "submission recording rejects mismatched client and tenant identities before side effects" do
    client = insert(:client)
    template = insert(:form_template, business: client.business)
    assignment = insert(:form_assignment, business: client.business, client: client, form_template: template)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    other_client = insert(:client, business: client.business)

    other_assignment =
      insert(:form_assignment, business: client.business, client: other_client, form_template: template)

    foreign_assignment = insert(:form_assignment)

    for {context, assignment_id} <- [
          {%{ctx | business_id: Ecto.UUID.generate()}, assignment.id},
          {%{ctx | client_id: Ecto.UUID.generate()}, assignment.id},
          {%{ctx | client_id: nil}, assignment.id},
          {ctx, other_assignment.id},
          {ctx, foreign_assignment.id}
        ] do
      assert {:error, :not_found} =
               Submissions.submit_client_assignment(context, assignment_id, %{answers: %{}})
    end

    refute Repo.exists?(FormSubmission)

    for target <- [assignment, other_assignment, foreign_assignment] do
      assert Repo.reload!(target).status == target.status
    end

    assert Repo.reload!(client).last_active_at == client.last_active_at
  end
end
