defmodule Easy.Repo.Migrations.AddLandingPageTemplateFields do
  use Ecto.Migration

  def change do
    alter table(:landing_pages) do
      # problem_fit's "This is for you if…" qualifier list (its signature section).
      add :fit_points, {:array, :string}, default: [], null: false
      # Hero imagery + the audience eyebrow the mockups lead with.
      add :hero_image_url, :string
      add :eyebrow, :string
    end
  end
end
