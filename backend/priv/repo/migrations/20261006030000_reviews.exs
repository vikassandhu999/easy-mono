defmodule Easy.Repo.Migrations.Reviews do
  use Ecto.Migration

  def change do
    alter table(:businesses) do
      add :default_review_frequency_days, :integer, null: false, default: 7
    end

    alter table(:clients) do
      add :review_frequency_days, :integer, null: false, default: 7
      add :focus, :string, size: 255
    end

    create constraint(:clients, :clients_review_frequency_check,
             check: "review_frequency_days IN (1,3,7,14,28)"
           )

    create constraint(:clients, :clients_focus_check,
             check: "focus IS NULL OR (length(focus) <= 255 AND focus !~ E'[\\n\\r]')"
           )

    create constraint(:businesses, :businesses_review_frequency_check,
             check: "default_review_frequency_days IN (1,3,7,14,28)"
           )

    alter table(:chat_messages) do
      add :edited_at, :utc_datetime_usec
    end

    drop constraint(:chat_messages, :chat_messages_embed_type_check)

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check: "embed_type IN ('training_session','meal','review')"
           )

    create table(:reviews, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
      add :coach_id, references(:coaches, type: :binary_id), null: false
      add :reviewed_at, :utc_datetime, null: false
      add :reviewed_through_seq, :bigint, null: false
      add :seen_at, :utc_datetime_usec, null: false
      add :snapshot_key, :text, null: false
      add :request_fingerprint, :text, null: false
      add :assessment, :text, null: false
      add :private_note, :text
      add :reply_message_id, references(:chat_messages, type: :binary_id, on_delete: :nilify_all)
      timestamps(type: :utc_datetime)
    end

    create unique_index(:reviews, [:business_id, :client_id, :snapshot_key])
    create index(:reviews, [:business_id, :client_id, :reviewed_at, :id])
    create unique_index(:reviews, [:business_id, :reply_message_id])

    create constraint(:reviews, :reviews_assessment_check,
             check: "assessment IN ('on_track','needs_attention','at_risk')"
           )

    create constraint(:reviews, :reviews_sequence_check, check: "reviewed_through_seq >= 0")

    execute "ALTER TABLE reviews ADD CONSTRAINT reviews_client_business_fkey FOREIGN KEY (client_id,business_id) REFERENCES clients(id,business_id)",
            "ALTER TABLE reviews DROP CONSTRAINT reviews_client_business_fkey"

    execute """
            CREATE FUNCTION preserve_review_facts() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF (NEW.business_id,NEW.client_id,NEW.coach_id,NEW.reviewed_at,NEW.reviewed_through_seq,NEW.seen_at)
                IS DISTINCT FROM (OLD.business_id,OLD.client_id,OLD.coach_id,OLD.reviewed_at,OLD.reviewed_through_seq,OLD.seen_at) THEN
                RAISE EXCEPTION 'review facts are immutable' USING ERRCODE = '23514';
              END IF;
              RETURN NEW;
            END $$
            """,
            "DROP FUNCTION preserve_review_facts()"

    execute "CREATE TRIGGER reviews_immutable BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION preserve_review_facts()",
            "DROP TRIGGER reviews_immutable ON reviews"
  end
end
