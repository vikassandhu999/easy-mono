defmodule Easy.Repo.Migrations.RemoveMuscleGroups do
  @moduledoc """
  Remove muscle_groups table and simplify muscles to a flat list.

  This migration:
  1. Drops the muscle_group_id column from muscles table
  2. Drops the muscle_groups table
  3. Cleans up duplicate muscles (keeps simple names)
  """
  use Ecto.Migration

  def up do
    # Step 1: Drop the foreign key constraint and column from muscles
    execute "ALTER TABLE muscles DROP CONSTRAINT IF EXISTS muscles_muscle_group_id_fkey"
    execute "DROP INDEX IF EXISTS muscles_muscle_group_id_index"
    execute "ALTER TABLE muscles DROP COLUMN IF EXISTS muscle_group_id"

    # Step 2: Delete duplicate/complex muscle names, keeping only simple ones
    # These are the simple names we want to keep
    simple_muscles = [
      "abdominals",
      "abductors",
      "adductors",
      "biceps",
      "calves",
      "chest",
      "forearms",
      "glutes",
      "hamstrings",
      "lats",
      "lower back",
      "middle back",
      "neck",
      "quadriceps",
      "shoulders",
      "traps",
      "triceps"
    ]

    # Build the SQL to delete muscles not in our simple list
    names_list = simple_muscles |> Enum.map(&"'#{&1}'") |> Enum.join(", ")

    execute """
    DELETE FROM exercise_muscles
    WHERE muscle_id IN (
      SELECT id FROM muscles WHERE LOWER(name) NOT IN (#{names_list})
    )
    """

    execute """
    DELETE FROM muscles WHERE LOWER(name) NOT IN (#{names_list})
    """

    # Step 3: Drop the muscle_groups table
    drop table(:muscle_groups)
  end

  def down do
    # Recreate muscle_groups table
    create table(:muscle_groups, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :string

      timestamps()
    end

    create unique_index(:muscle_groups, [:name])

    # Add muscle_group_id back to muscles
    alter table(:muscles) do
      add :muscle_group_id, references(:muscle_groups, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:muscles, [:muscle_group_id])
  end
end
