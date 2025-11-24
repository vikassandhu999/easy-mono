defmodule Easy.Repo.Migrations.RemoveTypeFromServingSizes do
  use Ecto.Migration

  def change do
    alter table(:serving_sizes) do
      remove :type
    end
  end
end
