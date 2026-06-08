defmodule Easy.Repo.Migrations.RestructureCoachesForSettings do
  use Ecto.Migration

  def up do
    alter table(:coaches) do
      add :first_name, :string
      add :last_name, :string
      add :phone, :string
    end

    flush()

    # Migrate existing name data: split on first space
    execute """
    UPDATE coaches
    SET first_name = CASE
          WHEN position(' ' in name) > 0 THEN left(name, position(' ' in name) - 1)
          ELSE name
        END,
        last_name = CASE
          WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
          ELSE NULL
        END
    WHERE name IS NOT NULL
    """

    alter table(:coaches) do
      remove :name
      remove :title
      remove :bio
    end
  end

  def down do
    alter table(:coaches) do
      add :name, :string
      add :title, :string
      add :bio, :string
    end

    flush()

    execute """
    UPDATE coaches
    SET name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    WHERE first_name IS NOT NULL OR last_name IS NOT NULL
    """

    alter table(:coaches) do
      remove :first_name
      remove :last_name
      remove :phone
    end
  end
end
