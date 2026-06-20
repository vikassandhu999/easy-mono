defmodule Easy.ClientProfilesTest do
  use Easy.SchemaCase, async: false

  alias Easy.ClientProfiles
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.Repo

  describe "client profile schemas" do
    test "client factory creator belongs to the same business" do
      client = build(:client)

      assert client.business.__meta__.state == :built
      assert client.creator.business == client.business
    end

    test "creates one profile per client" do
      client = insert_client()

      assert {:ok, profile} = ClientProfiles.get_or_create_profile(client.business_id, client.id)
      assert profile.client_id == client.id
      assert profile.general == %{}
      assert profile.nutrition == %{}

      assert {:ok, same_profile} = ClientProfiles.get_or_create_profile(client.business_id, client.id)
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

      assert {:error, changeset} =
               ClientProfiles.create_profile_field(business.id, %{
                 "section" => "nutrition",
                 "label" => "Meal prep ability",
                 "key" => "meal_prep_ability",
                 "field_type" => "select",
                 "options" => ["low", "medium", "high"]
               })

      assert "has already been taken" in errors_on(changeset).key
    end

    test "stores one custom field value per client and field" do
      client = insert_client()
      field = insert(:profile_field_definition, business: client.business)

      assert {:ok, value} =
               ClientProfiles.upsert_profile_field_value(
                 client.business_id,
                 client.id,
                 field.id,
                 "high",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )

      assert value.value == %{"value" => "high"}

      assert {:ok, updated} =
               ClientProfiles.upsert_profile_field_value(
                 client.business_id,
                 client.id,
                 field.id,
                 "low",
                 %{type: "coach", id: client.creator_id, submission_id: nil}
               )

      assert updated.id == value.id
      assert updated.value == %{"value" => "low"}

      assert 1 ==
               ProfileFieldValue
               |> ProfileFieldValue.for_client(client.id)
               |> ProfileFieldValue.for_field(field.id)
               |> Repo.aggregate(:count, :id)
    end

    test "accepts string-keyed actors and rejects invalid actor types" do
      client = insert_client()
      field = insert(:profile_field_definition, business: client.business)

      assert {:ok, value} =
               ClientProfiles.upsert_profile_field_value(
                 client.business_id,
                 client.id,
                 field.id,
                 "high",
                 %{"type" => "coach", "id" => client.creator_id}
               )

      assert value.updated_by_type == "coach"
      assert value.updated_by_id == client.creator_id

      assert {:error, :invalid_actor} =
               ClientProfiles.upsert_profile_field_value(
                 client.business_id,
                 client.id,
                 field.id,
                 "low",
                 %{type: "admin", id: client.creator_id}
               )

      assert {:error, :invalid_actor} =
               ClientProfiles.upsert_profile_field_value(
                 client.business_id,
                 client.id,
                 field.id,
                 "low",
                 %{"id" => client.creator_id}
               )
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

    test "does not return or submit assignments with cross-business templates" do
      client = insert_client()
      other_template = insert(:form_template)

      assignment =
        insert(:form_assignment,
          business: client.business,
          client: client,
          form_template: other_template
        )

      assert {:ok, []} = ClientProfiles.list_form_assignments_for_client(client.business_id, client.id)

      assert {:error, :not_found} =
               ClientProfiles.submit_form_assignment(client.business_id, client.id, assignment.id, %{
                 "answers" => %{}
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

      assert {:ok, submission} =
               ClientProfiles.submit_form_assignment(client.business_id, client.id, assignment.id, %{
                 "answers" => %{
                   "protein_goal" => "120g",
                   "meal_prep_ability" => "high"
                 }
               })

      profile = Repo.get_by!(ClientProfile, client_id: client.id)
      value = Repo.get_by!(ProfileFieldValue, client_id: client.id, profile_field_definition_id: field.id)

      assert profile.nutrition["protein_goal"] == "120g"
      assert value.value == %{"value" => "high"}
      assert value.updated_by_type == "client"
      assert value.updated_from_submission_id == submission.id
      assert Repo.get!(FormAssignment, assignment.id).status == "completed"
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

        assert {:error, :invalid_profile_mapping} =
                 ClientProfiles.submit_form_assignment(client.business_id, client.id, assignment.id, %{
                   "answers" => %{"protein_goal" => "120g"}
                 })

        refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
        refute Repo.get_by(ClientProfile, client_id: client.id)
        assert Repo.get!(FormAssignment, assignment.id).status == "assigned"
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

        assert {:error, :invalid_profile_mapping} =
                 ClientProfiles.submit_form_assignment(client.business_id, client.id, assignment.id, %{
                   "answers" => %{"meal_prep_ability" => "high"}
                 })

        refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
        refute Repo.get_by(ClientProfile, client_id: client.id)
        refute Repo.get_by(ProfileFieldValue, client_id: client.id)
        assert Repo.get!(FormAssignment, assignment.id).status == "assigned"
      end
    end
  end

  defp insert_client do
    business = insert(:business)
    creator = insert(:coach, business: business)

    insert(:client, business: business, creator: creator, user: insert(:user))
  end
end
