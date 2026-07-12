defmodule Easy.Repo.Migrations.DropClientProfileTables do
  use Ecto.Migration

  def up do
    drop table(:profile_field_values)
    drop table(:profile_field_definitions)
    drop table(:client_profiles)
  end

  def down do
    raise "irreversible: client profiles removed, see docs/superpowers/specs/2026-07-11-remove-client-profiles-design.md"
  end
end
