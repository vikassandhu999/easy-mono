defmodule Easy.Repo.Migrations.CreateCoaches do
  use Ecto.Migration

  def change do
    create table(:coaches, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, default: ""
      add :title, :string, default: ""
      add :bio, :string, default: ""

      add :user_id, references(:users, type: :binary_id, on_delete: :nothing)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:coaches, [:user_id, :business_id])
    create index(:coaches, [:business_id])
  end
end
