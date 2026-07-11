defmodule Easy.ClientProfilesTest do
  use Easy.SchemaCase, async: false

  alias Easy.ClientProfiles
  alias Easy.ClientProfiles.CheckInSchedule
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.Ctx
  alias Easy.Repo

  describe "client profile schemas" do
    test "uses the collapsed form purpose vocabulary" do
      business = insert(:business)

      assert FormTemplate.insert_changeset(business.id, %{
               "name" => "Weekly check-in",
               "purpose" => "check_in",
               "sections" => [],
               "status" => "active"
             }).valid?

      refute FormTemplate.insert_changeset(business.id, %{
               "name" => "Legacy weekly check-in",
               "purpose" => "weekly_check_in",
               "sections" => [],
               "status" => "active"
             }).valid?
    end

    test "advances check-in schedule frequencies" do
      assert {~D[2026-07-11], false} =
               CheckInSchedule.advance(%CheckInSchedule{frequency: :once, next_due_on: ~D[2026-07-11]})

      assert {~D[2026-07-18], true} =
               CheckInSchedule.advance(%CheckInSchedule{frequency: :weekly, next_due_on: ~D[2026-07-11]})

      assert {~D[2026-07-25], true} =
               CheckInSchedule.advance(%CheckInSchedule{frequency: :biweekly, next_due_on: ~D[2026-07-11]})

      assert {~D[2026-02-28], true} =
               CheckInSchedule.advance(%CheckInSchedule{frequency: :monthly, next_due_on: ~D[2026-01-31]})
    end

    test "allows only one active schedule per client and template" do
      client = insert_client()
      template = insert(:form_template, business: client.business, purpose: :check_in)

      attrs = %{frequency: :weekly, next_due_on: ~D[2026-07-11]}

      assert {:ok, _schedule} =
               client.business_id
               |> CheckInSchedule.insert_changeset(client.id, template.id, attrs)
               |> Repo.insert()

      assert {:error, changeset} =
               client.business_id
               |> CheckInSchedule.insert_changeset(client.id, template.id, attrs)
               |> Repo.insert()

      assert "has already been taken" in errors_on(changeset).client_id
    end

    test "accepts missed form assignments" do
      client = insert_client()
      template = insert(:form_template, business: client.business, purpose: :check_in)

      changeset =
        FormAssignment.insert_changeset(client.business_id, client.id, template.id, %{
          purpose: :check_in,
          status: :missed
        })

      assert changeset.valid?
    end

    test "client factory creator belongs to the same business" do
      client = build(:client)

      assert client.business.__meta__.state == :loaded
      assert client.creator.business == client.business
    end

    test "creates one profile per client" do
      client = insert_client()
      ctx = client_ctx(client)

      assert {:ok, profile} = ClientProfiles.get_or_create_profile(ctx, client.id)
      assert profile.client_id == client.id
      assert profile.general == %{}
      assert profile.nutrition == %{}

      assert {:ok, same_profile} = ClientProfiles.get_or_create_profile(ctx, client.id)
      assert same_profile.id == profile.id
    end

    test "rejects nil profile sections" do
      client = insert_client()

      changeset =
        ClientProfile.insert_changeset(client.business_id, client.id, %{
          "nutrition" => nil
        })

      refute changeset.valid?
      assert "can't be blank" in errors_on(changeset).nutrition
    end

    test "rejects filterable text custom fields" do
      business = insert(:business)

      changeset =
        ProfileFieldDefinition.insert_changeset(business.id, %{
          "section" => "nutrition",
          "label" => "Favorite foods",
          "key" => "favorite_foods",
          "field_type" => "text",
          "filterable" => true
        })

      refute changeset.valid?
      assert "cannot be filterable" in errors_on(changeset).filterable
    end

    test "accepts filterable select custom fields" do
      business = insert(:business)

      changeset =
        ProfileFieldDefinition.insert_changeset(business.id, %{
          "section" => "nutrition",
          "label" => "Meal prep ability",
          "key" => "meal_prep_ability",
          "field_type" => "select",
          "options" => ["low", "medium", "high"],
          "filterable" => true
        })

      assert changeset.valid?
    end

    test "rejects invalid form template statuses" do
      business = insert(:business)

      changeset =
        FormTemplate.insert_changeset(business.id, %{
          "name" => "Intake",
          "purpose" => "intake",
          "sections" => [],
          "status" => "draft"
        })

      refute changeset.valid?
      assert "is invalid" in errors_on(changeset).status
    end

    test "rejects duplicate custom field keys in one business" do
      business = insert(:business)
      insert(:profile_field_definition, business: business, key: "meal_prep_ability")
      ctx = %Ctx{business_id: business.id, user_id: Ecto.UUID.generate()}

      assert {:error, changeset} =
               ClientProfiles.create_profile_field(ctx, %{
                 "section" => "nutrition",
                 "label" => "Meal prep ability",
                 "key" => "meal_prep_ability",
                 "field_type" => "select",
                 "options" => ["low", "medium", "high"]
               })

      assert "has already been taken" in errors_on(changeset).key
    end

    test "create_profile_field ignores archived_at attrs" do
      business = insert(:business)
      ctx = %Ctx{business_id: business.id, user_id: Ecto.UUID.generate()}

      assert {:ok, field} =
               ClientProfiles.create_profile_field(ctx, %{
                 "section" => "nutrition",
                 "label" => "Meal prep ability",
                 "key" => "meal_prep_ability",
                 "field_type" => "select",
                 "options" => ["low", "medium", "high"],
                 "archived_at" => DateTime.utc_now(:second)
               })

      assert field.archived_at == nil
    end

    test "update_profile_field ignores archived_at attrs" do
      business = insert(:business)
      field = insert(:profile_field_definition, business: business)
      ctx = %Ctx{business_id: business.id, user_id: Ecto.UUID.generate()}

      assert {:ok, updated} =
               ClientProfiles.update_profile_field(ctx, field.id, %{
                 "archived_at" => DateTime.utc_now(:second)
               })

      assert updated.archived_at == nil
    end

    test "database rejects profiles for clients from another business" do
      client = insert_client()
      other_business = insert(:business)

      assert {:error, changeset} =
               other_business.id
               |> ClientProfile.insert_changeset(client.id)
               |> Repo.insert()

      assert "does not exist" in errors_on(changeset).client_id
    end

    test "database rejects custom field values that cross client or field businesses" do
      client = insert_client()
      other_client = insert_client()
      field = insert(:profile_field_definition, business: client.business)
      other_field = insert(:profile_field_definition, business: other_client.business)

      attrs = %{"value" => %{"value" => "high"}}

      assert {:error, client_changeset} =
               ProfileFieldValue.insert_changeset(client.business_id, other_client.id, field.id, :coach, client.creator_id, attrs)
               |> Repo.insert()

      assert "does not exist" in errors_on(client_changeset).client_id

      assert {:error, field_changeset} =
               ProfileFieldValue.insert_changeset(client.business_id, client.id, other_field.id, :coach, client.creator_id, attrs)
               |> Repo.insert()

      assert "does not exist" in errors_on(field_changeset).profile_field_definition_id
    end

    test "database rejects form assignments that cross client or template businesses" do
      client = insert_client()
      other_client = insert_client()
      template = insert(:form_template, business: client.business)
      other_template = insert(:form_template, business: other_client.business)

      attrs = %{"purpose" => "intake", "priority" => "normal", "status" => "assigned"}

      assert {:error, client_changeset} =
               client.business_id
               |> FormAssignment.insert_changeset(other_client.id, template.id, attrs)
               |> Repo.insert()

      assert "does not exist" in errors_on(client_changeset).client_id

      assert {:error, template_changeset} =
               client.business_id
               |> FormAssignment.insert_changeset(client.id, other_template.id, attrs)
               |> Repo.insert()

      assert "does not exist" in errors_on(template_changeset).form_template_id
    end

    test "database rejects form submissions for a different assignment client" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      assigned_client = insert(:client, business: business, creator: coach, user: insert(:user))
      submitting_client = insert(:client, business: business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: business)
      assignment = insert(:form_assignment, business: business, client: assigned_client, form_template: template)

      attrs = %{
        "question_snapshot" => [],
        "answers" => %{},
        "submitted_at" => DateTime.utc_now(:second)
      }

      assert {:error, changeset} =
               FormSubmission.insert_changeset(business.id, submitting_client.id, assignment.id, :client, submitting_client.id, attrs)
               |> Repo.insert()

      assert "does not exist" in errors_on(changeset).form_assignment_id
    end

    test "stores one custom field value per client and field" do
      client = insert_client()
      field = insert(:profile_field_definition, business: client.business)
      ctx = client_ctx(client)

      assert {:ok, value} =
               ClientProfiles.upsert_profile_field_value(
                 ctx,
                 client.id,
                 field.id,
                 "high",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )

      assert value.value == %{"value" => "high"}

      assert {:ok, updated} =
               ClientProfiles.upsert_profile_field_value(
                 ctx,
                 client.id,
                 field.id,
                 "low",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )

      assert updated.id == value.id
      assert updated.value == %{"value" => "low"}

      assert 1 ==
               ProfileFieldValue
               |> ProfileFieldValue.for_client(client.business_id, client.id)
               |> ProfileFieldValue.for_field(field.id)
               |> Repo.aggregate(:count, :id)
    end

    test "form assignment statuses are constrained" do
      client = insert_client()
      template = insert(:form_template, business: client.business)

      changeset =
        FormAssignment.insert_changeset(client.business_id, client.id, template.id, %{
          "purpose" => "intake",
          "priority" => "high",
          "status" => "submitted"
        })

      refute changeset.valid?
      assert "is invalid" in errors_on(changeset).status
    end

    test "assign_form_template_to_client forces template purpose and assigned status" do
      client = insert_client()
      template = insert(:form_template, business: client.business, purpose: "check_in")
      ctx = owner_ctx(client.business)
      completed_at = DateTime.utc_now(:second)

      assert {:ok, assignment} =
               ClientProfiles.assign_form_template_to_client(ctx, client.id, template.id, %{
                 priority: "high",
                 due_date: "2026-06-30",
                 purpose: "custom",
                 status: "completed",
                 completed_at: completed_at
               })

      assert assignment.purpose == :check_in
      assert assignment.priority == :high
      assert assignment.status == :assigned
      assert assignment.due_date == ~D[2026-06-30]
      assert assignment.completed_at == nil
    end

    test "delete_form_template rejects templates with assignments" do
      client = insert_client()
      template = insert(:form_template, business: client.business)
      assignment = insert(:form_assignment, business: client.business, client: client, form_template: template)
      ctx = client_ctx(client)

      assert {:error, :form_template_assigned} =
               ClientProfiles.delete_form_template(ctx, template.id)

      assert Repo.get!(FormTemplate, template.id)
      assert Repo.get!(FormAssignment, assignment.id)
    end

    test "does not return or submit assignments with cross-business templates" do
      client = insert_client()
      other_client = insert_client()
      other_template = insert(:form_template, business: other_client.business)

      assignment =
        insert(:form_assignment,
          business: other_client.business,
          client: other_client,
          form_template: other_template
        )

      ctx = owner_ctx(client.business)

      assert {:ok, []} = ClientProfiles.list_form_assignments_for_client(ctx, client.id)

      client_self_ctx = %Ctx{business_id: client.business_id, user_id: client.user_id}

      assert {:error, :not_found} =
               ClientProfiles.submit_client_form_assignment(client_self_ctx, assignment.id, %{
                 answers: %{}
               })
    end

    test "submits form assignments into core profile and custom field values" do
      client = insert_client()

      field =
        insert(:profile_field_definition,
          business: client.business,
          key: "meal_prep_ability",
          section: "nutrition"
        )

      template =
        insert(:form_template,
          business: client.business,
          sections: [
            %{
              "title" => "Nutrition",
              "section" => "nutrition",
              "questions" => [
                %{
                  "id" => "protein_goal",
                  "label" => "Protein goal",
                  "type" => "text",
                  "profile_mapping" => %{
                    "kind" => "core",
                    "section" => "nutrition",
                    "field" => "protein_goal"
                  }
                },
                %{
                  "id" => "meal_prep_ability",
                  "label" => "Meal prep ability",
                  "type" => "select",
                  "options" => ["low", "medium", "high"],
                  "profile_mapping" => %{
                    "kind" => "custom_field",
                    "field_key" => "meal_prep_ability"
                  }
                }
              ]
            }
          ]
        )

      assignment =
        insert(:form_assignment, business: client.business, client: client, form_template: template)

      client_self_ctx = %Ctx{business_id: client.business_id, user_id: client.user_id}

      assert {:ok, submission} =
               ClientProfiles.submit_client_form_assignment(client_self_ctx, assignment.id, %{
                 answers: %{
                   "protein_goal" => "120g",
                   "meal_prep_ability" => "high"
                 }
               })

      profile = Repo.get_by!(ClientProfile, client_id: client.id)
      value = Repo.get_by!(ProfileFieldValue, client_id: client.id, profile_field_definition_id: field.id)

      assert profile.nutrition["protein_goal"] == "120g"
      assert value.value == %{"value" => "high"}
      assert value.updated_by_type == :client
      assert value.updated_from_submission_id == submission.id
      assert Repo.get!(FormAssignment, assignment.id).status == :completed
    end

    test "malformed core profile mappings roll back submission and profile writes" do
      for mapping <- [
            %{"kind" => "core", "section" => "nutrition", "field" => nil},
            %{"kind" => "core", "section" => "nutrition"},
            %{"kind" => "core", "section" => "nutrition", "field" => ""},
            %{"kind" => "core", "section" => "nutrition", "field" => 123}
          ] do
        client = insert_client()

        template =
          insert(:form_template,
            business: client.business,
            sections: [
              %{
                "title" => "Nutrition",
                "section" => "nutrition",
                "questions" => [
                  %{
                    "id" => "protein_goal",
                    "label" => "Protein goal",
                    "type" => "text",
                    "profile_mapping" => mapping
                  }
                ]
              }
            ]
          )

        assignment =
          insert(:form_assignment, business: client.business, client: client, form_template: template)

        client_self_ctx = %Ctx{business_id: client.business_id, user_id: client.user_id}

        assert {:error, :invalid_profile_mapping} =
                 ClientProfiles.submit_client_form_assignment(client_self_ctx, assignment.id, %{
                   answers: %{"protein_goal" => "120g"}
                 })

        refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
        refute Repo.get_by(ClientProfile, client_id: client.id)
        assert Repo.get!(FormAssignment, assignment.id).status == :assigned
      end
    end

    test "malformed custom field mappings roll back submission and profile writes" do
      for mapping <- [
            %{"kind" => "custom_field", "field_key" => nil},
            %{"kind" => "custom_field"}
          ] do
        client = insert_client()

        template =
          insert(:form_template,
            business: client.business,
            sections: [
              %{
                "title" => "Nutrition",
                "section" => "nutrition",
                "questions" => [
                  %{
                    "id" => "meal_prep_ability",
                    "label" => "Meal prep ability",
                    "type" => "select",
                    "options" => ["low", "medium", "high"],
                    "profile_mapping" => mapping
                  }
                ]
              }
            ]
          )

        assignment =
          insert(:form_assignment, business: client.business, client: client, form_template: template)

        client_self_ctx = %Ctx{business_id: client.business_id, user_id: client.user_id}

        assert {:error, :invalid_profile_mapping} =
                 ClientProfiles.submit_client_form_assignment(client_self_ctx, assignment.id, %{
                   answers: %{"meal_prep_ability" => "high"}
                 })

        refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
        refute Repo.get_by(ClientProfile, client_id: client.id)
        refute Repo.get_by(ProfileFieldValue, client_id: client.id)
        assert Repo.get!(FormAssignment, assignment.id).status == :assigned
      end
    end
  end

  describe "assign_default_intake_to_client/2" do
    test "creates the template once per business and assigns it" do
      client = insert_client()
      ctx = owner_ctx(client.business)

      assert {:ok, assignment} = ClientProfiles.assign_default_intake_to_client(ctx, client.id)
      assert assignment.purpose == :intake
      assert assignment.status == :assigned

      client2 = insert(:client, business: client.business, status: :active)

      assert {:ok, assignment2} =
               ClientProfiles.assign_default_intake_to_client(ctx, client2.id)

      assert assignment2.form_template_id == assignment.form_template_id
      assert Repo.aggregate(FormTemplate, :count) == 1
    end
  end

  describe "intake submission completes intake_status" do
    test "submitting an intake assignment marks the profile intake completed" do
      client = insert_client()
      coach_ctx = owner_ctx(client.business)
      {:ok, assignment} = ClientProfiles.assign_default_intake_to_client(coach_ctx, client.id)

      ctx = client_ctx(client)
      answers = valid_required_answers(Easy.DefaultIntake.sections())

      assert {:ok, _submission} =
               ClientProfiles.submit_client_form_assignment(ctx, assignment.id, %{answers: answers})

      {:ok, profile} = ClientProfiles.get_or_create_profile(coach_ctx, client.id)
      assert profile.intake_status == :completed
      assert profile.intake_completed_at
      assert profile.general["primary_goal"] == "Lose weight"
    end
  end

  describe "tenant isolation and write-path guards" do
    test "upsert_profile_field_value rejects a field from another business" do
      client = insert_client()
      other_client = insert_client()
      other_field = insert(:profile_field_definition, business: other_client.business)
      ctx = client_ctx(client)

      assert {:error, :not_found} =
               ClientProfiles.upsert_profile_field_value(
                 ctx,
                 client.id,
                 other_field.id,
                 "high",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )
    end

    test "upsert_profile_field_value rejects a client from another business" do
      client = insert_client()
      other_client = insert_client()
      field = insert(:profile_field_definition, business: client.business)
      ctx = client_ctx(client)

      assert {:error, :not_found} =
               ClientProfiles.upsert_profile_field_value(
                 ctx,
                 other_client.id,
                 field.id,
                 "high",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )
    end

    test "field and template verbs return not_found for another business's resources" do
      business = insert(:business)
      other_client = insert_client()
      other_field = insert(:profile_field_definition, business: other_client.business)
      other_template = insert(:form_template, business: other_client.business)
      ctx = %Ctx{business_id: business.id, user_id: Ecto.UUID.generate()}

      other_assignment =
        insert(:form_assignment,
          business: other_client.business,
          client: other_client,
          form_template: other_template
        )

      assert {:error, :not_found} =
               ClientProfiles.update_profile_field(ctx, other_field.id, %{"label" => "x"})

      assert {:error, :not_found} = ClientProfiles.archive_profile_field(ctx, other_field.id)
      assert {:error, :not_found} = ClientProfiles.get_form_template(ctx, other_template.id)

      assert {:error, :not_found} =
               ClientProfiles.update_form_template(ctx, other_template.id, %{"name" => "x"})

      assert {:error, :not_found} =
               ClientProfiles.delete_form_template(ctx, other_template.id)

      assert {:error, :not_found} =
               ClientProfiles.update_form_assignment(ctx, other_assignment.id, %{
                 "priority" => "high"
               })
    end

    test "update_profile rejects a nil section" do
      client = insert_client()
      ctx = client_ctx(client)

      assert {:error, changeset} =
               ClientProfiles.update_profile(ctx, client.id, %{"nutrition" => nil})

      assert "can't be blank" in errors_on(changeset).nutrition
    end

    test "update_client_profile_sections ignores client-supplied intake workflow fields" do
      client = insert_client()
      client_self_ctx = %Ctx{business_id: client.business_id, user_id: client.user_id}

      assert {:ok, profile} =
               ClientProfiles.update_client_profile_sections(client_self_ctx, %{
                 "general" => %{"goal" => "strength"},
                 "intake_status" => "completed",
                 "intake_completed_at" => DateTime.utc_now(:second)
               })

      assert profile.general == %{"goal" => "strength"}
      assert profile.intake_status == :assigned
      assert profile.intake_completed_at == nil
    end

    test "update_form_assignment stamps and clears completed_at to match status" do
      client = insert_client()
      template = insert(:form_template, business: client.business)
      ctx = trainer_ctx(client.creator)

      assignment =
        insert(:form_assignment, business: client.business, client: client, form_template: template)

      assert {:ok, completed} =
               ClientProfiles.update_form_assignment(ctx, assignment.id, %{
                 "status" => "completed"
               })

      assert completed.status == :completed
      refute is_nil(completed.completed_at)

      assert {:ok, reopened} =
               ClientProfiles.update_form_assignment(ctx, assignment.id, %{
                 "status" => "assigned"
               })

      assert reopened.status == :assigned
      assert reopened.completed_at == nil
    end

    test "form template changeset rejects malformed section structure" do
      business = insert(:business)
      base = %{"name" => "Intake", "purpose" => "intake", "status" => "active"}

      bad_questions =
        FormTemplate.insert_changeset(business.id, Map.put(base, "sections", [%{"questions" => "nope"}]))

      refute bad_questions.valid?
      assert "has invalid structure" in errors_on(bad_questions).sections

      bad_mapping =
        FormTemplate.insert_changeset(
          business.id,
          Map.put(base, "sections", [
            %{
              "questions" => [
                %{"id" => "q1", "profile_mapping" => %{"kind" => "core", "section" => "nutrition", "field" => ""}}
              ]
            }
          ])
        )

      refute bad_mapping.valid?
      assert "has invalid structure" in errors_on(bad_mapping).sections

      good =
        FormTemplate.insert_changeset(
          business.id,
          Map.put(base, "sections", [
            %{
              "questions" => [
                %{"id" => "q1", "profile_mapping" => %{"kind" => "custom_field", "field_key" => "meal_prep"}}
              ]
            }
          ])
        )

      assert good.valid?
    end
  end

  describe "update_form_assignment/3 intake sync" do
    test "dismissing an intake assignment sets profile intake_status to dismissed" do
      client = insert_client()
      ctx = owner_ctx(client.business)
      template = insert(:form_template, business: client.business, purpose: :intake)

      assignment =
        insert(:form_assignment,
          business: client.business,
          client: client,
          form_template: template,
          purpose: :intake,
          status: :assigned
        )

      assert {:ok, %{status: :dismissed}} =
               ClientProfiles.update_form_assignment(ctx, assignment.id, %{status: :dismissed})

      assert {:ok, profile} = ClientProfiles.get_or_create_profile(ctx, client.id)
      assert profile.intake_status == :dismissed
      assert profile.intake_completed_at == nil
    end

    test "reopening a completed intake assignment resets profile intake_status" do
      client = insert_client()
      ctx = owner_ctx(client.business)
      template = insert(:form_template, business: client.business, purpose: :intake)
      completed_at = DateTime.utc_now(:second)

      assignment =
        insert(:form_assignment,
          business: client.business,
          client: client,
          form_template: template,
          purpose: :intake,
          status: :completed,
          completed_at: completed_at
        )

      assert {:ok, _profile} =
               ClientProfiles.update_profile(ctx, client.id, %{
                 intake_status: :completed,
                 intake_completed_at: completed_at
               })

      assert {:ok, %{status: :assigned}} =
               ClientProfiles.update_form_assignment(ctx, assignment.id, %{status: :assigned})

      assert {:ok, profile} = ClientProfiles.get_or_create_profile(ctx, client.id)
      assert profile.intake_status == :assigned
      assert profile.intake_completed_at == nil
    end

    test "updating a non-intake assignment does not touch the profile" do
      client = insert_client()
      ctx = owner_ctx(client.business)
      template = insert(:form_template, business: client.business, purpose: :check_in)

      assignment =
        insert(:form_assignment,
          business: client.business,
          client: client,
          form_template: template,
          purpose: :check_in
        )

      {:ok, profile_before} = ClientProfiles.get_or_create_profile(ctx, client.id)

      assert {:ok, _assignment} =
               ClientProfiles.update_form_assignment(ctx, assignment.id, %{status: :dismissed})

      {:ok, profile_after} = ClientProfiles.get_or_create_profile(ctx, client.id)
      assert profile_after.intake_status == profile_before.intake_status
      assert profile_after.updated_at == profile_before.updated_at
    end
  end

  describe "validate_answers/2" do
    @sections [
      %{
        "title" => "Week",
        "questions" => [
          %{"id" => "win", "label" => "Biggest win", "type" => "text", "required" => true},
          %{"id" => "weight", "label" => "Weight", "type" => "number", "required" => false},
          %{"id" => "slept-well", "label" => "Slept well?", "type" => "boolean", "required" => false},
          %{"id" => "start-date", "label" => "Start date", "type" => "date", "required" => false},
          %{
            "id" => "mood",
            "label" => "Mood",
            "type" => "select",
            "required" => false,
            "options" => ["Good", "Bad"]
          },
          %{
            "id" => "focus",
            "label" => "Focus areas",
            "type" => "multi_select",
            "required" => false,
            "options" => ["Training", "Nutrition"]
          }
        ]
      }
    ]

    test "accepts valid answers of every type" do
      answers = %{
        "win" => "Hit a PR",
        "weight" => 81.4,
        "slept-well" => true,
        "start-date" => "2026-07-11",
        "mood" => "Good",
        "focus" => ["Training", "Nutrition"]
      }

      assert :ok = FormSubmission.validate_answers(@sections, answers)
    end

    test "accepts omitted and blank optional answers" do
      assert :ok = FormSubmission.validate_answers(@sections, %{"win" => "x", "mood" => "", "focus" => []})
    end

    test "rejects a missing required answer" do
      assert {:error, :missing_required_answers} = FormSubmission.validate_answers(@sections, %{"weight" => 80})
      assert {:error, :missing_required_answers} = FormSubmission.validate_answers(@sections, %{"win" => ""})
    end

    test "rejects answers keyed by unknown question ids" do
      assert {:error, :unknown_answer_keys} =
               FormSubmission.validate_answers(@sections, %{"win" => "x", "hacked" => "boom"})
    end

    test "rejects wrong value types and out-of-options values" do
      for bad <- [
            %{"win" => 42},
            %{"win" => "x", "weight" => "eighty"},
            %{"win" => "x", "slept-well" => "yes"},
            %{"win" => "x", "start-date" => "not-a-date"},
            %{"win" => "x", "mood" => "Elated"},
            %{"win" => "x", "focus" => ["Training", "Sleep"]},
            %{"win" => "x", "focus" => "Training"}
          ] do
        assert {:error, :invalid_answer_values} = FormSubmission.validate_answers(@sections, bad),
               "expected rejection for #{inspect(bad)}"
      end
    end

    test "skips malformed sections and questions without crashing" do
      sections = [%{"title" => "no questions key"}, %{"questions" => "not-a-list"}, %{"questions" => ["junk"]}]
      assert :ok = FormSubmission.validate_answers(sections, %{})
    end
  end

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)
      template = insert(:form_template, business: business)
      assignment_b = insert(:form_assignment, business: business, client: client_b, form_template: template)

      %{
        business: business,
        trainer_a: trainer_a,
        client_b: client_b,
        template: template,
        assignment_b: assignment_b
      }
    end

    test "assign_form_template_to_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b,
      template: template
    } do
      assert {:error, :not_found} =
               ClientProfiles.assign_form_template_to_client(trainer_ctx(trainer_a), client_b.id, template.id, %{})
    end

    test "list_form_assignments_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} =
               ClientProfiles.list_form_assignments_for_client(trainer_ctx(trainer_a), client_b.id)
    end

    test "get_form_assignment_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b,
      assignment_b: assignment_b
    } do
      assert {:error, :not_found} =
               ClientProfiles.get_form_assignment_for_client(trainer_ctx(trainer_a), client_b.id, assignment_b.id)
    end

    test "get_or_create_profile_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} =
               ClientProfiles.get_or_create_profile_for_client(trainer_ctx(trainer_a), client_b.id)
    end

    test "update_profile_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} =
               ClientProfiles.update_profile_for_client(trainer_ctx(trainer_a), client_b.id, %{})
    end

    test "update_form_assignment returns :not_found for an assignment belonging to another trainer's client",
         %{trainer_a: trainer_a, assignment_b: assignment_b} do
      assert {:error, :not_found} =
               ClientProfiles.update_form_assignment(trainer_ctx(trainer_a), assignment_b.id, %{
                 "priority" => "high"
               })
    end

    test "list_form_submissions returns :not_found for an assignment belonging to another trainer's client",
         %{trainer_a: trainer_a, assignment_b: assignment_b} do
      assert {:error, :not_found} =
               ClientProfiles.list_form_submissions(trainer_ctx(trainer_a), assignment_b.id)
    end

    test "owner ctx succeeds on all of them", %{
      business: business,
      client_b: client_b,
      template: template,
      assignment_b: assignment_b
    } do
      ctx = owner_ctx(business)

      assert {:ok, _assignment} = ClientProfiles.assign_form_template_to_client(ctx, client_b.id, template.id, %{})
      assert {:ok, _assignments} = ClientProfiles.list_form_assignments_for_client(ctx, client_b.id)
      assert {:ok, %{id: id}} = ClientProfiles.get_form_assignment_for_client(ctx, client_b.id, assignment_b.id)
      assert id == assignment_b.id
      assert {:ok, _profile} = ClientProfiles.get_or_create_profile_for_client(ctx, client_b.id)
      assert {:ok, _profile} = ClientProfiles.update_profile_for_client(ctx, client_b.id, %{})
      assert {:ok, _updated} = ClientProfiles.update_form_assignment(ctx, assignment_b.id, %{"priority" => "high"})
      assert {:ok, _submissions} = ClientProfiles.list_form_submissions(ctx, assignment_b.id)
    end
  end

  defp insert_client do
    business = insert(:business)
    creator = insert(:coach, business: business)

    insert(:client, business: business, creator: creator, user: insert(:user))
  end

  defp client_ctx(client) do
    %Ctx{business_id: client.business_id, user_id: client.user_id}
  end

  defp valid_required_answers(sections) do
    for %{"questions" => questions} <- sections,
        %{"id" => id, "required" => true, "type" => type} = question <- questions,
        into: %{} do
      value =
        case type do
          "text" -> "Rice and dal"
          "number" -> 1
          "boolean" -> true
          "date" -> "2026-07-11"
          "select" -> hd(question["options"])
          "multi_select" -> [hd(question["options"])]
        end

      {id, value}
    end
  end
end
