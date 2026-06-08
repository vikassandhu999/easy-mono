defmodule Easy.Repo.Migrations.CreateFoods do
  use Ecto.Migration

  def change do
    create table(:foods, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false

      add :macros, :jsonb, default: fragment("'{}'::jsonb")
      add :serving_sizes, {:array, :jsonb}, default: []

      add :source, :string
      add :category, :string
      add :tags, {:array, :string}, default: []

      add :notes, :text
      add :image_url, :string

      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:foods, [:business_id])
    create index(:foods, [:business_id, "lower(name)"])
  end
end
