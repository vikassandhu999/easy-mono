defmodule Easy.Forms.RequiredServicesTest do
  use Easy.SchemaCase, async: false

  import Swoosh.TestAssertions

  alias Easy.Clients
  alias Easy.Forms
  alias Easy.Forms.FormSubmission
  alias Easy.Forms.FormTemplate

  @service_question %{
    "id" => "service-type",
    "label" => "Service type",
    "type" => "service_type"
  }

  describe "Service type template validation" do
    test "allows one closed Service type question on Intake" do
      business = insert(:business)

      changeset =
        FormTemplate.insert_changeset(business.id, template_attrs(:intake, [@service_question]))

      assert changeset.valid?
    end

    test "rejects duplicate Service type questions on Intake" do
      business = insert(:business)

      changeset =
        FormTemplate.insert_changeset(
          business.id,
          template_attrs(:intake, [@service_question, Map.put(@service_question, "id", "service-type-2")])
        )

      refute changeset.valid?
      assert errors_on(changeset).sections != []
    end

    test "rejects Service type on Check-in and rejects configurable options" do
      business = insert(:business)

      check_in =
        FormTemplate.insert_changeset(
          business.id,
          template_attrs(:check_in, [@service_question])
        )

      configurable =
        FormTemplate.insert_changeset(
          business.id,
          template_attrs(:intake, [Map.put(@service_question, "options", ["training"])])
        )

      refute check_in.valid?
      refute configurable.valid?
      assert errors_on(check_in).sections != []
      assert errors_on(configurable).sections != []
    end

    test "rejects Service type when evolving a system Check-in template" do
      template = %FormTemplate{purpose: :check_in, sections: [], system_version: 1}

      changeset =
        FormTemplate.system_content_changeset(template, sections([@service_question]), 2)

      refute changeset.valid?
      assert errors_on(changeset).sections != []
    end
  end

  describe "Service type answers" do
    test "accepts only canonical non-empty services arrays" do
      sections = sections([@service_question])

      assert :ok =
               FormSubmission.validate_answers(sections, %{
                 "service-type" => ["training"]
               })

      assert :ok =
               FormSubmission.validate_answers(sections, %{
                 "service-type" => ["nutrition"]
               })

      assert :ok =
               FormSubmission.validate_answers(sections, %{
                 "service-type" => ["training", "nutrition"]
               })

      for invalid <- [nil, [], ["nutrition", "training"], ["training", "training"], ["physio"]] do
        assert {:error, reason} =
                 FormSubmission.validate_answers(sections, %{"service-type" => invalid})

        assert reason in [:missing_required_answers, :invalid_answer_values]
      end
    end
  end

  describe "Intake submission required-services writes" do
    test "replaces the canonical set inside a successful Intake submission" do
      client = insert(:client, required_services: [:nutrition])
      template = insert_template(client.business, :intake, [@service_question])
      assignment = insert_assignment(client, template, :intake)

      assert {:ok, _submission} =
               Forms.submit_client_form_assignment(client_ctx(client), assignment.id, %{
                 answers: %{"service-type" => ["training", "nutrition"]}
               })

      assert Repo.reload(client).required_services == [:training, :nutrition]
    end

    test "Intake without Service type leaves the set unchanged" do
      client = insert(:client, required_services: [:nutrition])
      template = insert_template(client.business, :intake, [])
      assignment = insert_assignment(client, template, :intake)

      assert {:ok, _submission} =
               Forms.submit_client_form_assignment(client_ctx(client), assignment.id, %{
                 answers: %{}
               })

      assert Repo.reload(client).required_services == [:nutrition]
    end

    test "Check-in submission never changes services even for legacy malformed content" do
      client = insert(:client, required_services: [:nutrition])

      template =
        insert(:form_template,
          business: client.business,
          purpose: :check_in,
          sections: sections([@service_question])
        )

      assignment = insert_assignment(client, template, :check_in)

      assert {:ok, _submission} =
               Forms.submit_client_form_assignment(client_ctx(client), assignment.id, %{
                 answers: %{"service-type" => ["training"]}
               })

      assert Repo.reload(client).required_services == [:nutrition]
    end

    test "the latest successful Intake or direct coach edit wins" do
      client = insert(:client, required_services: [:training])
      template = insert_template(client.business, :intake, [@service_question])
      assignment = insert_assignment(client, template, :intake)

      assert {:ok, _submission} =
               Forms.submit_client_form_assignment(client_ctx(client), assignment.id, %{
                 answers: %{"service-type" => ["nutrition"]}
               })

      assert Repo.reload(client).required_services == [:nutrition]

      assert {:ok, updated} =
               Clients.update_client(owner_ctx(client.business), client.id, %{
                 required_services: [:training, :nutrition]
               })

      assert updated.required_services == [:training, :nutrition]
      assert Repo.reload(client).required_services == [:training, :nutrition]
    end
  end

  describe "single Intake assignment and reminders" do
    test "an Intake assignment conflicts with every existing Intake status" do
      for status <- [:assigned, :in_progress, :completed, :dismissed, :missed] do
        client = insert(:client)
        first_template = insert_template(client.business, :intake, [])
        second_template = insert_template(client.business, :intake, [])

        insert_assignment(client, first_template, :intake, status)

        assert {:error, :conflict} =
                 Forms.assign_form_template_to_client(
                   owner_ctx(client.business),
                   client.id,
                   second_template.id,
                   %{}
                 )
      end
    end

    test "sends a visible Intake reminder without changing queue membership facts" do
      client = insert(:client, email: "intake-reminder@example.com")
      template = insert_template(client.business, :intake, [])

      assignment =
        insert_assignment(client, template, :intake, :in_progress, due_date: Date.add(Date.utc_today(), -1))

      before = Repo.reload(assignment)

      assert {:ok, reminded} =
               Forms.send_intake_reminder(owner_ctx(client.business), assignment.id)

      assert reminded.id == assignment.id

      assert_email_sent(
        to: "intake-reminder@example.com",
        subject: "Your intake form is waiting"
      )

      after_reminder = Repo.reload(assignment)
      assert after_reminder.status == before.status
      assert after_reminder.completed_at == before.completed_at
      assert after_reminder.due_date == before.due_date
    end

    test "rejects non-Intake and cross-tenant reminders through context errors" do
      client = insert(:client)
      check_in = insert_template(client.business, :check_in, [])
      assignment = insert_assignment(client, check_in, :check_in)
      other_business = insert(:business)

      assert {:error, :invalid_intake_assignment} =
               Forms.send_intake_reminder(owner_ctx(client.business), assignment.id)

      assert {:error, :not_found} =
               Forms.send_intake_reminder(owner_ctx(other_business), assignment.id)

      refute_email_sent()
    end

    test "returns a context error when an Intake has no reminder email" do
      client = insert(:client, email: nil)
      intake = insert_template(client.business, :intake, [])
      assignment = insert_assignment(client, intake, :intake)

      assert {:error, :reminder_email_missing} =
               Forms.send_intake_reminder(owner_ctx(client.business), assignment.id)

      refute_email_sent()
    end
  end

  defp template_attrs(purpose, questions) do
    %{
      "name" => "Template",
      "purpose" => Atom.to_string(purpose),
      "sections" => sections(questions),
      "status" => "active"
    }
  end

  defp sections(questions), do: [%{"title" => "Basics", "questions" => questions}]

  defp insert_template(business, purpose, questions) do
    insert(:form_template,
      business: business,
      purpose: purpose,
      sections: sections(questions)
    )
  end

  defp insert_assignment(client, template, purpose, status \\ :assigned, attrs \\ []) do
    insert(
      :form_assignment,
      [
        business: client.business,
        client: client,
        form_template: template,
        purpose: purpose,
        status: status
      ] ++ attrs
    )
  end

  defp client_ctx(client) do
    %Easy.Ctx{
      business_id: client.business_id,
      user_id: client.user_id,
      client_id: client.id
    }
  end
end
