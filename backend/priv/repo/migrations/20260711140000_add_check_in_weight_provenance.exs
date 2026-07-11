defmodule Easy.Repo.Migrations.AddCheckInWeightProvenance do
  use Ecto.Migration

  def up do
    alter table(:businesses) do
      add :default_weight_unit, :string, null: false, default: "kg"
    end

    create constraint(:businesses, :businesses_default_weight_unit_check,
             check: "default_weight_unit in ('kg','lbs')"
           )

    create unique_index(:form_submissions, [:id, :client_id, :business_id],
             name: :form_submissions_id_client_id_business_id_index
           )

    alter table(:weight_entries) do
      add :form_submission_id,
          references(:form_submissions,
            type: :binary_id,
            on_delete: :delete_all,
            with: [client_id: :client_id, business_id: :business_id],
            name: :weight_entries_submission_client_business_id_fkey
          )
    end

    drop unique_index(:weight_entries, [:client_id, :date])

    create unique_index(:weight_entries, [:client_id, :date],
             name: :weight_entries_client_id_date_index,
             where: "form_submission_id IS NULL"
           )

    create index(:weight_entries, [:business_id, :client_id, :form_submission_id])
  end

  def down do
    drop index(:weight_entries, [:business_id, :client_id, :form_submission_id])
    drop unique_index(:weight_entries, [:client_id, :date])

    execute("""
    DELETE FROM weight_entries a
    USING weight_entries b
    WHERE a.client_id = b.client_id
      AND a.date = b.date
      AND (a.inserted_at, a.id) < (b.inserted_at, b.id)
    """)

    alter table(:weight_entries) do
      remove :form_submission_id
    end

    create unique_index(:weight_entries, [:client_id, :date])

    drop unique_index(:form_submissions, [:id, :client_id, :business_id],
           name: :form_submissions_id_client_id_business_id_index
         )

    drop constraint(:businesses, :businesses_default_weight_unit_check)

    alter table(:businesses) do
      remove :default_weight_unit
    end
  end
end
