defmodule Easy.Repo.Migrations.AddFormTemplateSystemVersions do
  use Ecto.Migration

  def up do
    alter table(:form_templates) do
      add :system_version, :integer
    end

    execute("UPDATE form_templates SET system_version = 1 WHERE system_key IS NOT NULL")

    create constraint(:form_templates, :form_templates_system_version_positive,
             check: "system_version IS NULL OR system_version > 0"
           )
  end

  def down do
    drop constraint(:form_templates, :form_templates_system_version_positive)

    alter table(:form_templates) do
      remove :system_version
    end
  end
end
