defmodule Easy.ClientProfilesTest do
  use Easy.SchemaCase, async: false

  alias Easy.ClientProfiles
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.Ctx
  alias Easy.Repo

  describe "client profile schemas" do
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
      template = insert(:form_template, business: client.business, purpose: "weekly_check_in")
      ctx = client_ctx(client)
      completed_at = DateTime.utc_now(:second)

      assert {:ok, assignment} =
               ClientProfiles.assign_form_template_to_client(ctx, client.id, template.id, %{
                 priority: "high",
                 due_date: "2026-06-30",
                 purpose: "custom",
                 status: "completed",
                 completed_at: completed_at
               })

      assert assignment.purpose == :weekly_check_in
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

      assert {:error, %Easy.Error{status: :unprocessable_entity, detail: detail}} =
               ClientProfiles.delete_form_template(ctx, template.id)

      assert detail == %{fields: %{form_template_id: ["has assignments"]}}
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

      ctx = client_ctx(client)

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

        assert {:error, %Easy.Error{status: :unprocessable_entity, detail: detail}} =
                 ClientProfiles.submit_client_form_assignment(client_self_ctx, assignment.id, %{
                   answers: %{"protein_goal" => "120g"}
                 })

        assert detail == %{fields: %{profile_mapping: ["is invalid"]}}
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
                    "profile_mapping" => mapping
                  }
                ]
              }
            ]
          )

        assignment =
          insert(:form_assignment, business: client.business, client: client, form_template: template)

        client_self_ctx = %Ctx{business_id: client.business_id, user_id: client.user_id}

        assert {:error, %Easy.Error{status: :unprocessable_entity, detail: detail}} =
                 ClientProfiles.submit_client_form_assignment(client_self_ctx, assignment.id, %{
                   answers: %{"meal_prep_ability" => "high"}
                 })

        assert detail == %{fields: %{profile_mapping: ["is invalid"]}}
        refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
        refute Repo.get_by(ClientProfile, client_id: client.id)
        refute Repo.get_by(ProfileFieldValue, client_id: client.id)
        assert Repo.get!(FormAssignment, assignment.id).status == :assigned
      end
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
      ctx = client_ctx(client)

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

  defp insert_client do
    business = insert(:business)
    creator = insert(:coach, business: business)

    insert(:client, business: business, creator: creator, user: insert(:user))
  end

  defp client_ctx(client) do
    %Ctx{business_id: client.business_id, user_id: client.user_id}
  end
end
