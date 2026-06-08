defmodule Easy.Repo.Migrations.RemovePositionFromMeals do
  use Ecto.Migration

  def change do
    drop_if_exists unique_index(:meals, [:plan_id, :position])

    alter table(:meals) do
      remove :position, :integer, default: 0
    end
  end
end
