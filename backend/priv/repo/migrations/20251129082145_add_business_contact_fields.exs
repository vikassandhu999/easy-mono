defmodule Easy.Repo.Migrations.AddBusinessContactFields do
  use Ecto.Migration

  def change do
    alter table(:businesses) do
      add :email, :string
      add :phone, :string
      add :address, :string
      add :city, :string
      add :state, :string
      add :country, :string
      add :postal_code, :string
      add :website, :string
      add :timezone, :string, default: "UTC"
    end
  end
end
