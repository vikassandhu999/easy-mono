defmodule Easy.Repo.Migrations.AddCoachProfileFields do
  use Ecto.Migration

  def change do
    alter table(:coaches) do
      add :instagram_url, :string
      add :facebook_url, :string
      add :youtube_url, :string
      add :x_url, :string
      add :years_of_experience, :integer
      add :certifications, {:array, :string}, default: []
    end
  end
end
