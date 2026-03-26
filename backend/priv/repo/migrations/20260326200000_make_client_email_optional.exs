defmodule Easy.Repo.Migrations.MakeClientEmailOptional do
  use Ecto.Migration

  def change do
    alter table(:clients) do
      modify :email, :string, null: true, from: {:string, null: false}
    end

    drop unique_index(:clients, [:business_id, :email])
    create unique_index(:clients, [:business_id, :email], where: "email IS NOT NULL")
  end
end
