defmodule Easy.Repo.Migrations.PreserveLandingApplications do
  use Ecto.Migration

  def up do
    alter table(:landing_pages) do
      add :revision, :integer, null: false, default: 1
    end

    create constraint(:landing_pages, :landing_pages_revision_check, check: "revision > 0")

    alter table(:landing_programs) do
      add :archived_at, :utc_datetime
    end

    alter table(:prospects) do
      add :submitted_program, :map
      add :submitted_questions, {:array, :map}, null: false, default: []
    end

    execute """
    UPDATE prospects AS prospect
    SET submitted_program = jsonb_build_object('id', program.id, 'name', program.name)
    FROM landing_programs AS program
    WHERE program.id = prospect.landing_program_id AND program.business_id = prospect.business_id
    """

    execute """
    UPDATE prospects AS prospect SET submitted_questions = page.application_questions
    FROM landing_pages AS page
    WHERE page.id = prospect.landing_page_id AND page.business_id = prospect.business_id
    """
  end

  def down do
    alter table(:prospects) do
      remove :submitted_questions
      remove :submitted_program
    end

    alter table(:landing_programs) do
      remove :archived_at
    end

    drop constraint(:landing_pages, :landing_pages_revision_check)

    alter table(:landing_pages) do
      remove :revision
    end
  end
end
