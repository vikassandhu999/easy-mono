defmodule Easy.Repo.Migrations.RemoveIsTemplateAndType do
  use Ecto.Migration

  def up do
    # Drop the old constraint that referenced is_template before dropping the column.
    execute "ALTER TABLE training_plans DROP CONSTRAINT assigned_plans_have_dates"

    alter table(:training_plans) do
      remove :is_template
    end

    # Re-create the constraint using client_id semantics:
    # templates (client_id IS NULL) don't need dates; assigned plans do.
    create constraint(:training_plans, :assigned_plans_have_dates,
             check: "client_id IS NULL OR (start_date IS NOT NULL AND end_date IS NOT NULL)"
           )

    alter table(:plans) do
      remove :type
    end
  end

  def down do
    alter table(:plans) do
      add :type, :string, default: "template"
    end

    execute "ALTER TABLE training_plans DROP CONSTRAINT assigned_plans_have_dates"

    alter table(:training_plans) do
      add :is_template, :boolean, default: true, null: false
    end

    create constraint(:training_plans, :assigned_plans_have_dates,
             check: "is_template = true OR (start_date IS NOT NULL AND end_date IS NOT NULL)"
           )
  end
end
