defmodule Easy.Repo.Migrations.ChangeRecipesIngredientsToJsonb do
  use Ecto.Migration

  def up do
    # Drop the existing GIN index
    drop_if_exists(index(:recipes, [:ingredients], using: :gin))

    # Add a temporary column to store the converted data
    alter table(:recipes) do
      add(:ingredients_jsonb, :jsonb)
    end

    # Convert existing data from array of strings to array of maps in temp column
    execute("""
    UPDATE recipes
    SET ingredients_jsonb = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', ingredient,
          'quantity', 0,
          'unit', ''
        )
      )
      FROM unnest(ingredients) AS ingredient
    )
    WHERE ingredients IS NOT NULL AND array_length(ingredients, 1) > 0
    """)

    # Set empty array for NULL or empty values
    execute("""
    UPDATE recipes
    SET ingredients_jsonb = '[]'::jsonb
    WHERE ingredients_jsonb IS NULL
    """)

    # Drop the old column
    alter table(:recipes) do
      remove(:ingredients)
    end

    # Rename the temporary column to the original name
    rename(table(:recipes), :ingredients_jsonb, to: :ingredients)

    # Set NOT NULL constraint and default value
    alter table(:recipes) do
      modify(:ingredients, :jsonb, null: false, default: "[]")
    end

    # Create GIN index on jsonb column for better query performance
    create(index(:recipes, [:ingredients], using: :gin))
  end

  def down do
    # Drop JSONB GIN index
    drop_if_exists(index(:recipes, [:ingredients], using: :gin))

    # Add temporary column for string array
    alter table(:recipes) do
      add(:ingredients_array, {:array, :string})
    end

    # Convert JSONB array of maps back to array of strings (extract only names)
    execute("""
    UPDATE recipes
    SET ingredients_array = (
      SELECT array_agg(ingredient->>'name')
      FROM jsonb_array_elements(ingredients) AS ingredient
    )
    WHERE ingredients != '[]'::jsonb
    """)

    # Set empty array for NULL values
    execute("""
    UPDATE recipes
    SET ingredients_array = ARRAY[]::text[]
    WHERE ingredients_array IS NULL
    """)

    # Drop the jsonb column
    alter table(:recipes) do
      remove(:ingredients)
    end

    # Rename temp column back to original name
    rename(table(:recipes), :ingredients_array, to: :ingredients)

    # Set default value
    alter table(:recipes) do
      modify(:ingredients, {:array, :string}, default: [])
    end

    # Recreate original GIN index
    create(index(:recipes, [:ingredients], using: :gin))
  end
end
