defmodule Easy.Repo.Migrations.CreateAcquisition do
  use Ecto.Migration

  def change do
    create table(:landing_pages, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :slug, :string, null: false
      add :template, :string, null: false
      add :headline, :string, null: false
      add :subheadline, :string
      add :coach_intro, :string
      add :proof_points, {:array, :map}, null: false, default: []
      add :application_questions, {:array, :map}, null: false, default: []
      add :status, :string, null: false, default: "draft"
      add :fit_points, {:array, :string}, null: false, default: []
      add :hero_image_url, :string
      add :eyebrow, :string
      add :revision, :integer, null: false, default: 1

      timestamps(type: :utc_datetime)
    end

    create unique_index(:landing_pages, [:id, :business_id])

    create unique_index(:landing_pages, [:business_id],
             name: :landing_pages_one_published_per_business,
             where: "status = 'published'"
           )

    create unique_index(:landing_pages, [:slug])

    create constraint(:landing_pages, :landing_pages_revision_check, check: "revision > 0")

    create constraint(:landing_pages, :landing_pages_status_check,
             check: "status in ('draft','published')"
           )

    create constraint(:landing_pages, :landing_pages_template_check,
             check: "template in ('proof_first','problem_fit','coach_story')"
           )

    create table(:landing_programs, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :name, :string, null: false
      add :audience, :string
      add :promise, :string
      add :description, :string
      add :price_display, :string
      add :position, :integer, null: false, default: 0

      add :landing_page_id,
          references(:landing_pages,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :landing_programs_page_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :archived_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:landing_programs, [:id, :business_id])
    create index(:landing_programs, [:landing_page_id])

    create table(:prospects, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :name, :string, null: false
      add :phone, :string
      add :email, :string
      add :instagram, :string
      add :answers, :map, null: false, default: %{}
      add :status, :string, null: false, default: "new"
      add :notes, :string

      add :landing_page_id,
          references(:landing_pages,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :prospects_page_business_id_fkey,
            on_delete: :nilify_all
          )

      add :landing_program_id,
          references(:landing_programs,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :prospects_program_business_id_fkey,
            on_delete: :nilify_all
          )

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :prospects_client_business_id_fkey,
            on_delete: :nilify_all
          )

      add :submitted_program, :map
      add :submitted_questions, {:array, :map}, null: false, default: []
      add :application_request_id, :binary_id
      add :application_fingerprint, :binary
      add :revision, :integer, null: false, default: 1

      timestamps(type: :utc_datetime)
    end

    create index(:prospects, [:business_id, :inserted_at, :id])
    create unique_index(:prospects, [:business_id, :landing_page_id, :application_request_id])
    create index(:prospects, [:business_id, :status])
    create index(:prospects, [:business_id, :status, :inserted_at, :id])
    create index(:prospects, [:landing_page_id])

    create constraint(:prospects, :prospects_enrolled_status_check,
             check: "client_id IS NULL OR status = 'won'"
           )

    create constraint(:prospects, :prospects_revision_check, check: "revision > 0")

    create constraint(:prospects, :prospects_status_check,
             check: "status in ('new','reviewing','won','lost')"
           )
  end
end
