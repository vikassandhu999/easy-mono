defmodule Easy.Repo.Migrations.AddStorefrontV2FieldsToStoreProfiles do
  use Ecto.Migration

  def change do
    alter table(:store_profiles) do
      add :headline, :text
      add :trust_stats, {:array, :map}, default: []
      add :faq_items, {:array, :map}, default: []
      add :whatsapp_cta_enabled, :boolean, default: false, null: false
      add :whatsapp_cta_message, :text
    end
  end
end
