defmodule Easy.Repo.Migrations.CreatePlans do
  use Ecto.Migration

  def change do
    create table(:plans, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :name, :string, null: false
      add :slug, :string, null: false
      add :description, :text
      add :price_cents, :integer, null: false
      add :billing_interval, :string, null: false
      add :features, :map
      add :limits, :map
      add :is_default, :boolean, default: false, null: false

      timestamps()
    end

    create unique_index(:plans, [:slug])
  end
end
