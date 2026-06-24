defmodule Easy.Repo.Migrations.DropStorefrontTables do
  use Ecto.Migration

  def change do
    drop_if_exists table(:leads)
    drop_if_exists table(:testimonials)
    drop_if_exists table(:store_profiles)
    drop_if_exists table(:offers)
  end
end
