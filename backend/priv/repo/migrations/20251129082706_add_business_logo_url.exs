defmodule Easy.Repo.Migrations.AddBusinessLogoUrl do
  use Ecto.Migration

  def change do
    alter table(:businesses) do
      add :logo_url, :string
    end
  end
end
