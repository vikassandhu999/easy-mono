defmodule Easy.Repo.Migrations.AddHotPathIndexes do
  use Ecto.Migration

  def change do
    # Daily sweeper queries are cross-tenant (no business_id), so every
    # existing business_id-leading index was useless: both ran as seq scans.
    create index(:form_assignments, [:purpose, :due_date],
             where: "status IN ('assigned', 'in_progress')",
             name: :form_assignments_reminder_sweep_index
           )

    create index(:check_in_schedules, [:next_due_on],
             where: "active",
             name: :check_in_schedules_due_sweep_index
           )

    # Inbox: Conversation.recent/1 orders by last_message_at under for_business;
    # the only prior index was unique(business_id, client_id).
    create index(:conversations, [:business_id, desc_nulls_last: :last_message_at])

    # Session lists: TrainingSession.newest/1 orders by started_at; prior
    # indexes stop at (business_id, client_id).
    create index(:training_sessions, [:business_id, :client_id, desc: :started_at])

    # Client "last active": max(date) per client over completed sessions and
    # non-empty meal logs (Client.last_activity/1). Partial covering indexes
    # let both UNION halves resolve without touching the tables.
    create index(:training_sessions, [:business_id, :client_id, :date],
             where: "state = 'completed' AND date IS NOT NULL",
             name: :training_sessions_last_activity_index
           )

    create index(:nutrition_meal_logs, [:business_id, :client_id, :date],
             where: "logged_calories > 0",
             name: :nutrition_meal_logs_last_activity_index
           )

    # Coach/client unread counts are correlated counts filtered by sender_type;
    # the (conversation_id, inserted_at) index can't satisfy them alone.
    create index(:chat_messages, [:conversation_id, :sender_type, :inserted_at])

    # business_id was added to these tenant children without an index; the FK
    # cascade on business delete seq-scans without one.
    create index(:chat_messages, [:business_id])
    create index(:nutrition_recipe_ingredients, [:business_id])
  end
end
