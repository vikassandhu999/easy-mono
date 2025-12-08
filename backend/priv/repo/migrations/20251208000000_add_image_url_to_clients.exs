defmodule Easy.Repo.Migrations.AddImageUrlToClients do
  use Ecto.Migration

  def change do
    alter table(:clients) do
      add :image_url, :string
    end
  end
end
