defmodule Easy.Repo.Migrations.AddCheckInSubmissionCursorIndexes do
  use Ecto.Migration

  def change do
    create index(:form_submissions, [:business_id, "inserted_at DESC", "id DESC"],
             name: :form_submissions_business_cursor_index
           )

    create index(:form_submissions, [:business_id, :client_id, "inserted_at DESC", "id DESC"],
             name: :form_submissions_client_cursor_index
           )
  end
end
