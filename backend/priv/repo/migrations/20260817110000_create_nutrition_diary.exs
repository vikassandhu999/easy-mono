defmodule Easy.Repo.Migrations.CreateNutritionDiary do
  use Ecto.Migration

  def change do
    create table(:nutrition_diary_slots, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :local_date, :date, null: false
      add :meal_slot, :string, null: false
      add :applied_timezone, :string, null: false
      add :has_coverage, :boolean, null: false
      add :revision, :integer, null: false, default: 1
      add :active_frozen_option_id, :binary_id

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :nutrition_diary_slots_client_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:nutrition_diary_slots, [:id, :business_id])

    create unique_index(
             :nutrition_diary_slots,
             [:business_id, :client_id, :local_date, :meal_slot],
             name: :nutrition_diary_slots_identity_index
           )

    create constraint(:nutrition_diary_slots, :nutrition_diary_slots_meal_slot_check,
             check:
               "meal_slot in ('early_morning','breakfast','mid_morning','lunch','afternoon','evening','dinner','pre_sleep','pre_workout','during_workout','post_workout')"
           )

    create constraint(:nutrition_diary_slots, :nutrition_diary_slots_revision_check,
             check: "revision > 0"
           )

    create table(:nutrition_diary_frozen_options, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :meal_name, :string, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_diary_slot_id,
          references(:nutrition_diary_slots,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :nutrition_diary_frozen_options_slot_business_id_fkey
          ),
          null: false

      add :nutrition_meal_id,
          references(:nutrition_meals, type: :binary_id, on_delete: :nilify_all),
          null: true

      timestamps(type: :utc_datetime)
    end

    create unique_index(
             :nutrition_diary_frozen_options,
             [:id, :nutrition_diary_slot_id, :business_id],
             name: :nutrition_diary_frozen_options_id_slot_business_index
           )

    create unique_index(:nutrition_diary_frozen_options, [:nutrition_diary_slot_id, :position],
             name: :nutrition_diary_frozen_options_slot_position_index
           )

    create constraint(
             :nutrition_diary_frozen_options,
             :nutrition_diary_frozen_options_position_check,
             check: "position >= 0"
           )

    execute(
      """
      ALTER TABLE nutrition_diary_slots
      ADD CONSTRAINT nutrition_diary_slots_active_option_fkey
      FOREIGN KEY (active_frozen_option_id, id, business_id)
      REFERENCES nutrition_diary_frozen_options (id, nutrition_diary_slot_id, business_id)
      DEFERRABLE INITIALLY DEFERRED
      """,
      "ALTER TABLE nutrition_diary_slots DROP CONSTRAINT nutrition_diary_slots_active_option_fkey"
    )

    create table(:nutrition_diary_frozen_planned_items, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :kind, :string, null: false
      add :display_name, :string, null: false
      add :portion_kind, :string, null: false
      add :weight_g, :float
      add :amount, :float
      add :unit, :string
      add :serving_label, :string
      add :calories, :float
      add :protein, :float
      add :carbohydrates, :float
      add :fat, :float
      add :fiber, :float
      add :complete, :boolean, null: false, default: false
      add :position, :integer, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :nutrition_diary_slot_id, :binary_id, null: false

      add :nutrition_diary_frozen_option_id, :binary_id, null: false

      add :source_meal_item_id,
          references(:nutrition_meal_items, type: :binary_id, on_delete: :nilify_all)

      add :food_id, references(:nutrition_foods, type: :binary_id, on_delete: :nilify_all)
      add :recipe_id, references(:nutrition_recipes, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    execute(
      """
      ALTER TABLE nutrition_diary_frozen_planned_items
      ADD CONSTRAINT nutrition_diary_frozen_items_option_slot_business_fkey
      FOREIGN KEY (nutrition_diary_frozen_option_id, nutrition_diary_slot_id, business_id)
      REFERENCES nutrition_diary_frozen_options (id, nutrition_diary_slot_id, business_id)
      ON DELETE CASCADE
      """,
      "ALTER TABLE nutrition_diary_frozen_planned_items DROP CONSTRAINT nutrition_diary_frozen_items_option_slot_business_fkey"
    )

    create unique_index(
             :nutrition_diary_frozen_planned_items,
             [:id, :nutrition_diary_slot_id, :business_id],
             name: :nutrition_diary_frozen_items_id_slot_business_index
           )

    create unique_index(
             :nutrition_diary_frozen_planned_items,
             [:nutrition_diary_frozen_option_id, :position],
             name: :nutrition_diary_frozen_items_option_position_index
           )

    create constraint(
             :nutrition_diary_frozen_planned_items,
             :nutrition_diary_frozen_items_kind_check,
             check: "kind in ('food','recipe')"
           )

    create constraint(
             :nutrition_diary_frozen_planned_items,
             :nutrition_diary_frozen_items_portion_kind_check,
             check: "portion_kind in ('gram','serving')"
           )

    create constraint(
             :nutrition_diary_frozen_planned_items,
             :nutrition_diary_frozen_items_position_check,
             check: "position >= 0"
           )

    create constraint(
             :nutrition_diary_frozen_planned_items,
             :nutrition_diary_frozen_items_live_refs_check,
             check: "num_nonnulls(food_id, recipe_id) <= 1"
           )

    create table(:nutrition_diary_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :kind, :string, null: false
      add :display_name, :string, null: false
      add :portion_kind, :string, null: false
      add :weight_g, :float
      add :amount, :float
      add :unit, :string
      add :serving_label, :string
      add :calories, :float
      add :protein, :float
      add :carbohydrates, :float
      add :fat, :float
      add :fiber, :float
      add :complete, :boolean, null: false, default: false
      add :notes, :string
      add :revision, :integer, null: false, default: 1

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :nutrition_diary_entries_client_business_id_fkey
          ),
          null: false

      add :nutrition_diary_slot_id,
          references(:nutrition_diary_slots,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :nutrition_diary_entries_slot_business_id_fkey
          ),
          null: false

      add :frozen_planned_item_id, :binary_id
      add :frozen_option_id, :binary_id

      add :food_id, references(:nutrition_foods, type: :binary_id, on_delete: :nilify_all)
      add :recipe_id, references(:nutrition_recipes, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    execute(
      """
      ALTER TABLE nutrition_diary_entries
      ADD CONSTRAINT nutrition_diary_entries_fulfilment_slot_business_fkey
      FOREIGN KEY (frozen_planned_item_id, nutrition_diary_slot_id, business_id)
      REFERENCES nutrition_diary_frozen_planned_items (id, nutrition_diary_slot_id, business_id)
      ON DELETE SET NULL
      """,
      "ALTER TABLE nutrition_diary_entries DROP CONSTRAINT nutrition_diary_entries_fulfilment_slot_business_fkey"
    )

    create unique_index(:nutrition_diary_entries, [:frozen_planned_item_id],
             where: "frozen_planned_item_id IS NOT NULL",
             name: :nutrition_diary_entries_one_fulfilment_index
           )

    create index(:nutrition_diary_entries, [:nutrition_diary_slot_id])

    create constraint(:nutrition_diary_entries, :nutrition_diary_entries_kind_check,
             check: "kind in ('food','recipe')"
           )

    create constraint(:nutrition_diary_entries, :nutrition_diary_entries_portion_kind_check,
             check: "portion_kind in ('gram','serving')"
           )

    create constraint(:nutrition_diary_entries, :nutrition_diary_entries_revision_check,
             check: "revision > 0"
           )

    create constraint(:nutrition_diary_entries, :nutrition_diary_entries_live_refs_check,
             check: "num_nonnulls(food_id, recipe_id) <= 1"
           )

    create constraint(:nutrition_diary_entries, :nutrition_diary_entries_display_name_check,
             check: "char_length(display_name) > 0"
           )

    create table(:nutrition_diary_command_ledger, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :idempotency_key, :binary_id, null: false
      add :fingerprint, :string, null: false
      add :outcome, :binary
      add :expires_at, :utc_datetime, null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :nutrition_diary_command_ledger_client_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(
             :nutrition_diary_command_ledger,
             [:business_id, :client_id, :idempotency_key],
             name: :nutrition_diary_command_ledger_client_key_index
           )

    create index(:nutrition_diary_command_ledger, [:expires_at],
             name: :nutrition_diary_command_ledger_expires_index
           )
  end
end
