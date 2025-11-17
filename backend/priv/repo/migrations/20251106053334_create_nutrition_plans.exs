defmodule Easy.Repo.Migrations.CreateNutritionPlans do
  use Ecto.Migration

  def change do
    create table(:nutrition_plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :thumbnail_url, :string
      add :is_template, :boolean, default: true
      add :status, :string, null: false, default: "active"
      add :duration_weeks, :integer
      add :start_date, :date
      add :tags, {:array, :string}, default: []

      add :client_id, references(:clients, on_delete: :delete_all, type: :binary_id)

      add :original_plan_id,
          references(:nutrition_plans, on_delete: :nilify_all, type: :binary_id)

      add :business_id, references(:businesses, on_delete: :delete_all, type: :binary_id),
        null: false

      add :creator_id, references(:coaches, on_delete: :nilify_all, type: :binary_id)

      timestamps()
    end

    create index(:nutrition_plans, [:business_id])
    create index(:nutrition_plans, [:creator_id])
    create index(:nutrition_plans, [:client_id])
    create index(:nutrition_plans, [:original_plan_id])
    create index(:nutrition_plans, [:status])
  end
end
