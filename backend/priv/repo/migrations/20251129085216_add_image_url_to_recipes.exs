defmodule Easy.Repo.Migrations.AddImageUrlToRecipes do
  use Ecto.Migration

  def change do
    alter table(:recipes) do
      add :image_url, :string
    end
  end
end
