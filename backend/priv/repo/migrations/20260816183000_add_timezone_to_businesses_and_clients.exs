defmodule Easy.Repo.Migrations.AddTimezoneToBusinessesAndClients do
  use Ecto.Migration

  def change do
    alter table(:businesses) do
      add :timezone, :string, null: false, default: "Asia/Kolkata"
    end

    alter table(:clients) do
      add :timezone, :string, null: false, default: "Asia/Kolkata"
    end
  end
end
