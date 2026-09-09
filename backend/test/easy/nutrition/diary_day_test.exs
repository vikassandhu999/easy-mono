defmodule Easy.Nutrition.DiaryDayTest do
  use Easy.SchemaCase

  alias Easy.Nutrition.DiaryDay

  test "creation owns client identity and date while accepting optional targets" do
    client = insert(:client)
    date = Date.utc_today()

    assert {:ok, day} =
             client.business_id
             |> DiaryDay.insert_changeset(client.id, date, %{
               business_id: Ecto.UUID.generate(),
               client_id: Ecto.UUID.generate(),
               local_date: Date.add(date, 1),
               target_calories: 1800
             })
             |> Repo.insert()

    assert day.business_id == client.business_id
    assert day.client_id == client.id
    assert day.local_date == date
    assert day.target_calories == 1800.0
    assert day.target_protein_g == nil
  end

  test "negative targets and missing identity return changeset errors" do
    targets = [:target_calories, :target_protein_g, :target_carbs_g, :target_fat_g, :target_fiber_g]
    attrs = Map.new(targets, &{&1, -1})
    changeset = DiaryDay.insert_changeset(nil, nil, nil, attrs)

    for field <- targets do
      assert errors_on(changeset)[field] == ["must be greater than or equal to 0"]
    end

    for field <- [:business_id, :client_id, :local_date] do
      assert errors_on(changeset)[field] == ["can't be blank"]
    end
  end

  test "cross-tenant and missing clients return constraint errors" do
    client = insert(:client)
    other_business = insert(:business)

    for {business_id, client_id} <- [
          {other_business.id, client.id},
          {client.business_id, Ecto.UUID.generate()}
        ] do
      assert {:error, changeset} =
               business_id
               |> DiaryDay.insert_changeset(client_id, Date.utc_today(), %{})
               |> Repo.insert()

      assert errors_on(changeset).client_id == ["does not exist"]
    end
  end
end
