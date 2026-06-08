defmodule Easy.Repo.Migrations.ReplaceFoodLogsWithMealLogs do
  use Ecto.Migration

  def change do
    drop_if_exists index(:food_logs, [:client_id, :date])
    drop_if_exists index(:food_logs, [:client_id, :date, :meal_slot])
    drop_if_exists index(:food_logs, [:business_id, :client_id, :date])
    drop_if_exists table(:food_logs)

    create table(:meal_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date, null: false
      add :meal_slot, :string, null: false
      add :planned_snapshot, :map
      add :planned_calories, :float
      add :logged_calories, :float, default: 0

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
      add :business_id, references(:businesses, type: :binary_id), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:meal_logs, [:client_id, :date, :meal_slot])
    create index(:meal_logs, [:business_id, :client_id])

    create table(:food_log_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :food_name, :string, null: false
      add :amount, :float
      add :unit, :string
      add :weight_g, :float
      add :calories, :float
      add :protein_g, :float
      add :carbs_g, :float
      add :fat_g, :float
      add :notes, :string
      add :source, :string, null: false, default: "planned"
      add :planned_item_index, :integer

      add :meal_log_id, references(:meal_logs, type: :binary_id, on_delete: :delete_all),
        null: false

      add :food_id, references(:foods, type: :binary_id, on_delete: :nilify_all)
      add :recipe_id, references(:recipes, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:food_log_entries, [:meal_log_id])
  end
end
