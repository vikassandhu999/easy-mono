defmodule Easy.Repo.Migrations.AddFormSubmissionReviews do
  use Ecto.Migration

  def change do
    alter table(:form_submissions) do
      add :reviewed_at, :utc_datetime
      add :reviewed_by_id, references(:users, type: :binary_id, on_delete: :nothing)
    end

    create index(:form_submissions, [:business_id, :reviewed_at, :submitted_at])
  end
end
