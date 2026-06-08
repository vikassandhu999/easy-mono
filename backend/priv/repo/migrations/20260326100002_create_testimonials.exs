defmodule Easy.Repo.Migrations.CreateTestimonials do
  use Ecto.Migration

  def change do
    create table(:testimonials, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :client_name, :string, null: false
      add :client_handle, :string
      add :quote, :text
      add :rating, :integer
      add :result_tag, :string
      add :program_name, :string
      add :duration_text, :string
      add :before_image_url, :string
      add :after_image_url, :string
      add :before_weight, :decimal
      add :after_weight, :decimal
      add :is_featured, :boolean, default: false, null: false
      add :status, :string, null: false, default: "active"
      add :position, :integer, null: false, default: 0

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create index(:testimonials, [:business_id])
  end
end
