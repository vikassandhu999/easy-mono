defmodule Easy.Repo.Migrations.CreateNutritionPlans do
  use Ecto.Migration

  def change do
    create table(:plans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :tags, {:array, :string}, default: []
      add :macros_goal, :jsonb, default: fragment("'{}'::jsonb")
      add :type, :string, default: "template"
      add :status, :string, default: "draft"

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)
      add :client_id, references(:clients, type: :binary_id, on_delete: :nilify_all)
      add :source_template_id, references(:plans, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime)
    end

    create index(:plans, [:business_id])
    create index(:plans, [:business_id, :client_id])
  end
end
