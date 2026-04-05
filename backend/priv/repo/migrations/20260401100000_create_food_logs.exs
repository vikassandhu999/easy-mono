defmodule Easy.Repo.Migrations.CreateFoodLogs do
  use Ecto.Migration

  def change do
    create table(:food_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date, null: false
      add :meal_slot, :string, null: false
      add :amount, :float
      add :unit, :string
      add :weight_g, :float
      add :notes, :string
      add :macros_snapshot, :map
      add :food_name_snapshot, :string

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :food_id, references(:foods, type: :binary_id, on_delete: :nilify_all)
      add :recipe_id, references(:recipes, type: :binary_id, on_delete: :nilify_all)
      add :meal_item_id, references(:meal_items, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:food_logs, [:client_id, :date])
    create index(:food_logs, [:client_id, :date, :meal_slot])
    create index(:food_logs, [:business_id, :client_id, :date])
  end
end
