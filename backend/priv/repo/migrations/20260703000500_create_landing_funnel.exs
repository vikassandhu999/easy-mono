defmodule Easy.Repo.Migrations.CreateLandingFunnelGreenfield do
  use Ecto.Migration

  def change do
    create table(:landing_pages, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :slug, :string, null: false
      add :template, :string, null: false
      add :headline, :string, null: false
      add :subheadline, :string
      add :coach_intro, :string
      add :proof_points, {:array, :map}, default: [], null: false
      add :application_questions, {:array, :map}, default: [], null: false
      add :status, :string, null: false, default: "draft"
      add :fit_points, {:array, :string}, default: [], null: false
      add :hero_image_url, :string
      add :eyebrow, :string

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:landing_pages, :landing_pages_template_check,
             check: "template in ('proof_first','problem_fit','coach_story')"
           )

    create constraint(:landing_pages, :landing_pages_status_check,
             check: "status in ('draft','published')"
           )

    create unique_index(:landing_pages, [:slug])

    create unique_index(:landing_pages, [:business_id],
             where: "status = 'published'",
             name: :landing_pages_one_published_per_business
           )

    create unique_index(:landing_pages, [:id, :business_id],
             name: :landing_pages_id_business_id_index
           )

    create table(:landing_programs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :audience, :string
      add :promise, :string
      add :description, :string
      add :price_display, :string
      add :position, :integer, null: false, default: 0

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :landing_page_id,
          references(:landing_pages,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :landing_programs_page_business_id_fkey
          ),
          null: false

      timestamps(type: :utc_datetime)
    end

    create index(:landing_programs, [:landing_page_id])

    create unique_index(:landing_programs, [:id, :business_id],
             name: :landing_programs_id_business_id_index
           )

    create table(:prospects, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :phone, :string
      add :email, :string
      add :instagram, :string
      add :answers, :map, default: %{}, null: false
      add :status, :string, null: false, default: "new"
      add :notes, :string

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :landing_page_id,
          references(:landing_pages,
            type: :binary_id,
            on_delete: :nilify_all,
            with: [business_id: :business_id],
            name: :prospects_page_business_id_fkey
          )

      add :landing_program_id,
          references(:landing_programs,
            type: :binary_id,
            on_delete: :nilify_all,
            with: [business_id: :business_id],
            name: :prospects_program_business_id_fkey
          )

      add :client_id,
          references(:clients,
            type: :binary_id,
            on_delete: :nilify_all,
            with: [business_id: :business_id],
            name: :prospects_client_business_id_fkey
          )

      timestamps(type: :utc_datetime)
    end

    create constraint(:prospects, :prospects_status_check,
             check: "status in ('new','reviewing','won','lost')"
           )

    create index(:prospects, [:business_id, :status])
    create index(:prospects, [:landing_page_id])
  end
end
