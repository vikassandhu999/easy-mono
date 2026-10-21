defmodule Easy.Repo.Migrations.PreserveFormReviewWait do
  use Ecto.Migration

  def change do
    alter table(:form_submissions) do
      add :review_pending_since, :utc_datetime
    end

    execute("UPDATE form_submissions SET review_pending_since = submitted_at", "SELECT 1")
  end
end
