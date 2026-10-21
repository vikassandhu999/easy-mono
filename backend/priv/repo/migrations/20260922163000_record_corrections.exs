defmodule Easy.Repo.Migrations.RecordCorrections do
  use Ecto.Migration

  def change do
    alter table(:form_submissions) do
      add :revision, :integer, null: false, default: 1
      add :reviewed_revision, :integer
      add :corrected_at, :utc_datetime
    end

    execute "UPDATE form_submissions SET reviewed_revision = 1 WHERE reviewed_at IS NOT NULL",
            "SELECT 1"

    create constraint(:form_submissions, :form_submissions_revision_positive,
             check:
               "revision > 0 AND (reviewed_revision IS NULL OR reviewed_revision BETWEEN 1 AND revision)"
           )

    alter table(:training_sessions) do
      add :revision, :integer, null: false, default: 1
    end

    create constraint(:training_sessions, :training_sessions_revision_positive,
             check: "revision > 0"
           )
  end
end
