defmodule Easy.Repo.Migrations.ReviewPrecision do
  use Ecto.Migration

  def change do
    alter table(:reviews) do
      modify :reviewed_at, :utc_datetime_usec, from: :utc_datetime
    end
  end
end
