defmodule Easy.Repo.Migrations.DropRecipeIngredientsTimestamps do
  use Ecto.Migration

  # Dead columns: never cast, serialized, queried, or read anywhere. Reversible
  # (rollback re-adds them, nullable — prior data is not recoverable).
  def change do
    alter table(:recipe_ingredients) do
      remove :inserted_at, :utc_datetime
      remove :updated_at, :utc_datetime
    end
  end
end
