defmodule Easy.Repo.Migrations.CreateThreadsGreenfield do
  use Ecto.Migration

  def change do
    create table(:threads, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :module, :string, null: false
      add :subject_type, :string, null: false, default: "general"
      add :subject_ref, :map, null: false, default: %{}
      add :title, :string
      add :status, :string, null: false, default: "open"
      add :priority, :string, null: false, default: "normal"
      add :last_message_at, :utc_datetime
      add :last_message_preview, :string
      add :created_by_type, :string, null: false
      add :created_by_id, :binary_id

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:threads, [:business_id, :client_id])
    create index(:threads, [:business_id, :status])
    create index(:threads, [:business_id, :module])

    create constraint(:threads, :threads_module_check,
             check: "module in ('nutrition','training','fitness','profile','general')"
           )

    create constraint(:threads, :threads_status_check,
             check: "status in ('open','resolved','archived')"
           )

    create constraint(:threads, :threads_priority_check,
             check: "priority in ('normal','attention')"
           )

    create constraint(:threads, :threads_created_by_type_check,
             check: "created_by_type in ('coach','client','system')"
           )

    create table(:thread_messages, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :body, :text, null: false
      add :kind, :string, null: false, default: "message"
      add :author_type, :string, null: false
      add :author_id, :binary_id
      add :metadata, :map, null: false, default: %{}

      add :thread_id, references(:threads, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:thread_messages, [:thread_id])

    create constraint(:thread_messages, :thread_messages_author_type_check,
             check: "author_type in ('coach','client','system')"
           )
  end
end
