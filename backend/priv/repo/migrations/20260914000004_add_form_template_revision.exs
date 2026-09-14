defmodule Easy.Repo.Migrations.AddFormTemplateRevision do
  use Ecto.Migration

  def up do
    alter table(:form_templates) do
      add :revision, :integer, null: false, default: 1
    end

    execute "UPDATE form_templates SET is_default_intake = false WHERE status != 'active' OR purpose != 'intake'"
    create constraint(:form_templates, :form_templates_revision_check, check: "revision > 0")

    create constraint(:form_templates, :form_templates_default_active_intake_check,
             check: "NOT is_default_intake OR (status = 'active' AND purpose = 'intake')"
           )

    create index(:form_templates, [:business_id, :status, :inserted_at, :id])
  end

  def down do
    drop index(:form_templates, [:business_id, :status, :inserted_at, :id])
    drop constraint(:form_templates, :form_templates_default_active_intake_check)
    drop constraint(:form_templates, :form_templates_revision_check)
    alter table(:form_templates), do: remove(:revision)
  end
end
