defmodule Easy.Repo.Migrations.AddFormTemplateSystemKeys do
  use Ecto.Migration

  def change do
    alter table(:form_templates) do
      add :system_key, :string
    end

    create unique_index(:form_templates, [:business_id, :system_key],
             where: "system_key IS NOT NULL"
           )
  end
end
