defmodule Easy.Nutrition.DiaryDocumentTest do
  use Easy.SchemaCase, async: true
  alias Easy.Nutrition.DiarySlot.Document

  test "frozen values survive a storage round trip without Library rows" do
    attrs = document()
    [option] = attrs.options
    [item] = option.items

    entry = Map.merge(item, %{id: Ecto.UUID.generate(), planned_item_ref: item.id, notes: "Ate half"})
    attrs = %{attrs | entries: [entry]}
    assert {:ok, document} = %Document{} |> Document.changeset(attrs) |> apply_action(:insert)

    stored = document |> Ecto.embedded_dump(:json) |> Jason.encode!() |> Jason.decode!()
    loaded = Ecto.embedded_load(Document, stored, :json)
    assert loaded == document
    assert hd(loaded.entries).nutrients.fiber == nil
    refute hd(loaded.entries).nutrients.complete
    assert hd(loaded.entries).portion.grams == nil
  end

  test "each frozen item and entry requires one source, a positive portion and nonnegative nutrients" do
    attrs = document()
    [option] = attrs.options
    [item] = option.items

    for invalid <- [
          %{item | food_id: nil},
          Map.put(item, :recipe_id, Ecto.UUID.generate()),
          %{item | id: "invalid"},
          %{item | name: ""},
          %{item | portion: %{kind: :gram, grams: 0}},
          %{item | portion: %{kind: :serving, amount: 1, unit: ""}},
          %{item | nutrients: %{item.nutrients | calories: -1}},
          %{item | nutrients: Map.delete(item.nutrients, :protein)}
        ] do
      offered = %{attrs | options: [%{option | items: [invalid]}]}
      refute Document.changeset(%Document{}, offered).valid?, inspect(invalid)
      refute Document.changeset(%Document{}, %{meal_id: nil, options: [], entries: [invalid]}).valid?, inspect(invalid)
    end
  end

  test "a selection and every fulfilled reference must belong to this document" do
    attrs = document()
    [option] = attrs.options
    [item] = option.items
    entry = Map.merge(item, %{id: Ecto.UUID.generate(), planned_item_ref: item.id})

    for invalid <- [
          %{attrs | meal_id: nil},
          %{attrs | meal_id: Ecto.UUID.generate()},
          %{attrs | entries: [%{entry | planned_item_ref: Ecto.UUID.generate()}]},
          %{attrs | entries: [entry, %{entry | id: Ecto.UUID.generate()}]},
          %{attrs | entries: [entry, entry]},
          %{attrs | options: [option, option]},
          %{attrs | options: [%{option | items: [item, item]}]}
        ] do
      refute Document.changeset(%Document{}, invalid).valid?
    end
  end

  defp document do
    option_id = Ecto.UUID.generate()

    %{
      meal_id: option_id,
      options: [
        %{
          id: option_id,
          name: "Breakfast",
          items: [
            %{
              id: Ecto.UUID.generate(),
              name: "Frozen food",
              food_id: Ecto.UUID.generate(),
              portion: %{kind: :serving, amount: 1.5, unit: "cup", label: nil, grams: nil},
              nutrients: %{calories: 120.5, protein: 4.0, carbohydrates: 20.0, fat: 2.0, fiber: nil}
            }
          ]
        }
      ],
      entries: []
    }
  end
end
