defmodule Easy.Repo.Migrations.AddFoodSearchVector do
  use Ecto.Migration

  def up do
    execute """
    ALTER TABLE foods
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED
    """

    execute """
    CREATE INDEX foods_search_vector_idx ON foods USING gin (search_vector)
    """
  end

  def down do
    execute "DROP INDEX IF EXISTS foods_search_vector_idx"

    alter table(:foods) do
      remove :search_vector
    end
  end
end
