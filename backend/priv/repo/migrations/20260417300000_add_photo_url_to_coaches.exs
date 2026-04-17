defmodule Easy.Repo.Migrations.AddPhotoUrlToCoaches do
  use Ecto.Migration

  def change do
    alter table(:coaches) do
      add :photo_url, :string
    end
  end
end
