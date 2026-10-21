defmodule Easy.Repo.Migrations.ReviewTenantIntegrity do
  use Ecto.Migration

  def change do
    execute "ALTER TABLE reviews ADD CONSTRAINT reviews_coach_business_fkey FOREIGN KEY (coach_id,business_id) REFERENCES coaches(id,business_id)",
            "ALTER TABLE reviews DROP CONSTRAINT reviews_coach_business_fkey"

    execute "ALTER TABLE reviews ADD CONSTRAINT reviews_reply_business_fkey FOREIGN KEY (reply_message_id,business_id) REFERENCES chat_messages(id,business_id)",
            "ALTER TABLE reviews DROP CONSTRAINT reviews_reply_business_fkey"
  end
end
