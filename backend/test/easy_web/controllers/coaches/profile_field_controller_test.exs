defmodule EasyWeb.Coaches.ProfileFieldControllerTest do
  use Easy.ConnCase

  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.Repo

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "GET /v1/coach/profile-fields" do
    test "lists active fields in the authenticated coach business only", %{
      conn: conn,
      business: business
    } do
      field = insert(:profile_field_definition, business: business)

      insert(:profile_field_definition,
        business: business,
        archived_at: DateTime.utc_now(:second)
      )

      other_coach = insert(:coach)
      insert(:profile_field_definition, business: other_coach.business)

      conn = get(conn, "/v1/coach/profile-fields")

      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["id"] == field.id
      assert data["key"] == field.key
      assert data["archived_at"] == nil
    end
  end

  describe "POST /v1/coach/profile-fields" do
    test "creates a filterable select field", %{conn: conn} do
      conn =
        post(conn, "/v1/coach/profile-fields", %{
          "section" => "nutrition",
          "label" => "Meal prep ability",
          "key" => "meal_prep_ability",
          "field_type" => "select",
          "options" => ["low", "medium", "high"],
          "filterable" => true
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["key"] == "meal_prep_ability"
      assert data["filterable"] == true
      assert data["options"] == ["low", "medium", "high"]
    end

    test "ignores archived_at on create", %{conn: conn} do
      conn =
        post(conn, "/v1/coach/profile-fields", %{
          "section" => "nutrition",
          "label" => "Meal prep ability",
          "key" => "meal_prep_ability",
          "field_type" => "select",
          "options" => ["low", "medium", "high"],
          "archived_at" => DateTime.utc_now(:second)
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["archived_at"] == nil
    end

    test "rejects filterable text fields with 422", %{conn: conn} do
      conn =
        post(conn, "/v1/coach/profile-fields", %{
          "section" => "nutrition",
          "label" => "Meal prep notes",
          "key" => "meal_prep_notes",
          "field_type" => "text",
          "filterable" => true
        })

      assert json_response(conn, 422)
    end
  end

  describe "PATCH /v1/coach/profile-fields/:id" do
    test "updates label and options", %{conn: conn, business: business} do
      field = insert(:profile_field_definition, business: business)

      conn =
        patch(conn, "/v1/coach/profile-fields/#{field.id}", %{
          "label" => "Meal prep confidence",
          "options" => ["low", "medium", "high", "expert"]
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == field.id
      assert data["label"] == "Meal prep confidence"
      assert data["options"] == ["low", "medium", "high", "expert"]
    end

    test "ignores archived_at on update", %{conn: conn, business: business} do
      field = insert(:profile_field_definition, business: business)

      conn =
        patch(conn, "/v1/coach/profile-fields/#{field.id}", %{
          "archived_at" => DateTime.utc_now(:second)
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["archived_at"] == nil
      assert Repo.get!(ProfileFieldDefinition, field.id).archived_at == nil
    end

    test "does not update another business's field", %{conn: conn} do
      other_coach = insert(:coach)

      field =
        insert(:profile_field_definition,
          business: other_coach.business,
          label: "Unchanged label"
        )

      conn =
        patch(conn, "/v1/coach/profile-fields/#{field.id}", %{
          "label" => "Changed label"
        })

      assert json_response(conn, 404)
      assert Repo.get!(ProfileFieldDefinition, field.id).label == "Unchanged label"
    end
  end

  describe "DELETE /v1/coach/profile-fields/:id" do
    test "archives field and removes it from list", %{coach: coach, conn: conn, business: business} do
      field = insert(:profile_field_definition, business: business)

      conn = delete(conn, "/v1/coach/profile-fields/#{field.id}")

      assert response(conn, 204) == ""
      assert Repo.get!(ProfileFieldDefinition, field.id).archived_at

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> get("/v1/coach/profile-fields")

      assert %{"data" => []} = json_response(conn, 200)
    end

    test "does not archive another business's field", %{conn: conn} do
      other_coach = insert(:coach)
      field = insert(:profile_field_definition, business: other_coach.business)

      conn = delete(conn, "/v1/coach/profile-fields/#{field.id}")

      assert json_response(conn, 404)
      assert Repo.get!(ProfileFieldDefinition, field.id).archived_at == nil
    end
  end
end
