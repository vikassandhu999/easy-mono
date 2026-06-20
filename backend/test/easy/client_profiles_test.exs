defmodule Easy.ClientProfilesTest do
  use Easy.SchemaCase, async: false

  alias Easy.ClientProfiles
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition

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
  end

  defp insert_client do
    business = insert(:business)
    creator = insert(:coach, business: business)

    insert(:client, business: business, creator: creator, user: insert(:user))
  end
end
