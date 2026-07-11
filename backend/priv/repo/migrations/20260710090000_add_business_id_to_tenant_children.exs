defmodule Easy.Repo.Migrations.AddBusinessIdToTenantChildren do
  use Ecto.Migration

  def up do
    alter table(:chat_messages) do
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    alter table(:nutrition_recipe_ingredients) do
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)
    end

    # These tables are small today. If they grow, batch these backfills and use a
    # NOT VALID check constraint before promoting the columns to NOT NULL.
    execute("""
    UPDATE chat_messages AS message
    SET business_id = conversation.business_id
    FROM conversations AS conversation
    WHERE message.conversation_id = conversation.id
    """)

    execute("""
    UPDATE nutrition_recipe_ingredients AS ingredient
    SET business_id = recipe.business_id
    FROM nutrition_recipes AS recipe
    WHERE ingredient.recipe_id = recipe.id
    """)

    execute("ALTER TABLE chat_messages ALTER COLUMN business_id SET NOT NULL")
    execute("ALTER TABLE nutrition_recipe_ingredients ALTER COLUMN business_id SET NOT NULL")
  end

  def down do
    alter table(:nutrition_recipe_ingredients) do
      remove :business_id
    end

    alter table(:chat_messages) do
      remove :business_id
    end
  end
end
