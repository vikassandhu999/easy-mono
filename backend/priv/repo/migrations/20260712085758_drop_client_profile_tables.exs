defmodule Easy.Repo.Migrations.DropClientProfileTables do
  use Ecto.Migration

  def up do
    drop table(:profile_field_values)
    drop table(:profile_field_definitions)
    drop table(:client_profiles)
  end

  def down do
    raise "irreversible: client profiles removed"
  end
end
