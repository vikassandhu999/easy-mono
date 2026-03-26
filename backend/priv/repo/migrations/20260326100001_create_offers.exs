defmodule Easy.Repo.Migrations.CreateOffers do
  use Ecto.Migration

  def change do
    create table(:offers, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :slug, :string, null: false
      add :description, :text
      add :type, :string
      add :duration_text, :string
      add :price, :integer
      add :currency, :string, default: "INR"
      add :price_display, :string
      add :features, {:array, :string}, default: []
      add :is_featured, :boolean, default: false, null: false
      add :status, :string, null: false, default: "active"
      add :position, :integer, null: false, default: 0
      add :cta_text, :string, default: "Get started"

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create index(:offers, [:business_id])
    create unique_index(:offers, [:business_id, :slug])
  end
end
