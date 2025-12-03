defmodule Easy.Repo.Migrations.AddUnitIdToServingSizes do
  use Ecto.Migration

  def change do
    alter table(:serving_sizes) do
      add :unit_id, references(:measurement_units, type: :binary_id, on_delete: :nilify_all)
    end

    # Unique constraint to prevent duplicate serving sizes for same ingredient+unit
    # Only applies when unit_id is not null
    create unique_index(:serving_sizes, [:ingredient_id, :unit_id],
             name: :serving_sizes_ingredient_id_unit_id_index,
             where: "unit_id IS NOT NULL"
           )
  end
end
