defmodule Easy.Nutrition.Diary.IdempotencyTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.Diary.Idempotency
  alias Easy.Nutrition.DiaryCommandLedger
  alias Easy.Repo

  import Easy.Factory

  @date ~D[2026-08-25]

  test "semantic command identities preserve every legacy route fingerprint" do
    cases = [
      {:add_extra,
       %{
         meal_slot: :breakfast,
         food_id: "food-id",
         recipe_id: nil,
         portion: %{kind: :gram, grams: 80.0},
         notes: "note"
       }, "bbb89fe39ab3fffff369d355b31b875ded45bcb35b7167c7bab24be3a27d2d7a"},
      {:log_planned_item, %{meal_slot: :breakfast, meal_item_id: "meal-item-id"}, "4681bf6c1195334088bcccd2a2b1d06975e7f73350604348520c6af6cd7abe68"},
      {:log_planned_option, %{meal_slot: :lunch}, "f7ce7732686dc6152a07688fa8bcb24ea0346238358c2b406aed00788e19eddd"},
      {:log_planned_day, %{}, "6e251e0e2e9aa22df324179d82069a5a335d8a855dd5fad42a5e537739662559"},
      {:switch_option, %{meal_slot: :dinner, meal_id: "meal-id", expected_revision: 2}, "c96517e54aa15c3a1e732c686f0aafeea131896646131fe2e24623bdd497b2b4"},
      {:replace_planned_item,
       %{
         meal_slot: :breakfast,
         meal_item_id: "meal-item-id",
         food_id: "food-id",
         recipe_id: nil,
         portion: %{kind: :gram, grams: 90.0},
         notes: nil,
         expected_revision: 3
       }, "ffb5bab0b857edaf404a58ff89ce57b55db78208e79236f458eb46a57a469abf"},
      {{:update_entry, "entry-id"}, %{expected_revision: 4, portion: nil, notes: "updated"}, "13feebe1cfdccf75a3d865d4ea0e5414ef23ca637d3425f2a1b1550e06222dd1"},
      {{:delete_entry, "entry-id"}, %{expected_revision: 5}, "94eff8652485c81eb8ac5712695390bba4d4455a59aded39d1a66859bb5b042e"}
    ]

    for {command, payload, legacy_fingerprint} <- cases do
      assert Idempotency.fingerprint(command, @date, payload) == legacy_fingerprint
    end
  end

  test "planned commands keep the internal meal_item_id fingerprint payload" do
    payload = %{meal_slot: :breakfast, meal_item_id: "meal-item-id"}

    assert Idempotency.fingerprint(:log_planned_item, @date, payload) ==
             "4681bf6c1195334088bcccd2a2b1d06975e7f73350604348520c6af6cd7abe68"

    refute Idempotency.fingerprint(:log_planned_item, @date, %{
             meal_slot: :breakfast,
             planned_item_ref: "meal-item-id"
           }) ==
             "4681bf6c1195334088bcccd2a2b1d06975e7f73350604348520c6af6cd7abe68"
  end

  test "an abort callback rolls back its reservation and the key can be retried" do
    client = insert(:client)
    key = Ecto.UUID.generate()

    assert {:error, :late_constraint} =
             Idempotency.run(client, key, :add_extra, @date, %{}, fn _now ->
               {:rollback, :late_constraint}
             end)

    refute Repo.get_by(DiaryCommandLedger, client_id: client.id, idempotency_key: key)

    assert {:ok, %{slots: []}} =
             Idempotency.run(client, key, :add_extra, @date, %{}, fn _now ->
               {:ok, %{slots: []}}
             end)

    assert Repo.get_by!(DiaryCommandLedger, client_id: client.id, idempotency_key: key).outcome
  end

  test "an ordinary domain error is stored and replayed without executing again" do
    client = insert(:client)
    key = Ecto.UUID.generate()

    assert {:error, :not_found} =
             Idempotency.run(client, key, :add_extra, @date, %{}, fn _now ->
               send(self(), :executed)
               {:error, :not_found}
             end)

    assert_receive :executed
    ledger = Repo.get_by!(DiaryCommandLedger, client_id: client.id, idempotency_key: key)
    assert :erlang.binary_to_term(ledger.outcome) == {:error, :not_found}

    assert {:error, :not_found} =
             Idempotency.run(client, key, :add_extra, @date, %{}, fn _now ->
               send(self(), :executed_again)
               {:ok, %{slots: []}}
             end)

    refute_receive :executed_again
  end
end
