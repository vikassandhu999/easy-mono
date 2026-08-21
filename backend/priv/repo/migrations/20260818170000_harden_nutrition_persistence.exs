defmodule Easy.Repo.Migrations.HardenNutritionPersistence do
  use Ecto.Migration

  def up do
    create index(
             :nutrition_week_schedule,
             [:nutrition_day_pattern_id, :nutrition_plan_id, :business_id],
             name: :nutrition_week_schedule_pattern_index
           )

    create index(
             :nutrition_meal_options,
             [:nutrition_meal_id, :nutrition_plan_id, :business_id],
             name: :nutrition_meal_options_meal_index
           )

    create index(
             :nutrition_diary_entries,
             [:business_id, :nutrition_diary_slot_id],
             name: :nutrition_diary_entries_business_slot_index
           )

    create unique_index(
             :nutrition_diary_slots,
             [:id, :client_id, :business_id],
             name: :nutrition_diary_slots_id_client_business_index
           )

    execute("""
    ALTER TABLE nutrition_diary_entries
    ADD CONSTRAINT nutrition_diary_entries_slot_client_business_id_fkey
    FOREIGN KEY (nutrition_diary_slot_id, client_id, business_id)
    REFERENCES nutrition_diary_slots (id, client_id, business_id)
    ON DELETE CASCADE
    """)

    execute("""
    ALTER TABLE nutrition_diary_entries
    ADD CONSTRAINT nutrition_diary_entries_option_slot_business_id_fkey
    FOREIGN KEY (frozen_option_id, nutrition_diary_slot_id, business_id)
    REFERENCES nutrition_diary_frozen_options (id, nutrition_diary_slot_id, business_id)
    """)
  end

  def down do
    drop constraint(
           :nutrition_diary_entries,
           :nutrition_diary_entries_option_slot_business_id_fkey
         )

    drop constraint(
           :nutrition_diary_entries,
           :nutrition_diary_entries_slot_client_business_id_fkey
         )

    drop index(
           :nutrition_diary_slots,
           [:id, :client_id, :business_id],
           name: :nutrition_diary_slots_id_client_business_index
         )

    drop index(
           :nutrition_diary_entries,
           [:business_id, :nutrition_diary_slot_id],
           name: :nutrition_diary_entries_business_slot_index
         )

    drop index(
           :nutrition_meal_options,
           [:nutrition_meal_id, :nutrition_plan_id, :business_id],
           name: :nutrition_meal_options_meal_index
         )

    drop index(
           :nutrition_week_schedule,
           [:nutrition_day_pattern_id, :nutrition_plan_id, :business_id],
           name: :nutrition_week_schedule_pattern_index
         )
  end
end
