defmodule Easy.Repo.Migrations.AddFormTemplateDefaultIntake do
  use Ecto.Migration

  def change do
    alter table(:form_templates) do
      add :is_default_intake, :boolean, null: false, default: false
    end

    create unique_index(:form_templates, [:business_id],
             where: "is_default_intake",
             name: :form_templates_one_default_intake_index
           )

    # Purpose is fixed at creation, so this check can never block an update.
    # Status stays out deliberately: archiving a default must not raise — the
    # invite query just stops matching it and falls back.
    create constraint(:form_templates, :form_templates_default_intake_purpose_check,
             check: "NOT is_default_intake OR purpose = 'intake'"
           )
  end
end
