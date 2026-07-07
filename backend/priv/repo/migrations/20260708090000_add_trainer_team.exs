defmodule Easy.Repo.Migrations.AddTrainerTeam do
  use Ecto.Migration

  def up do
    alter table(:coaches) do
      add :email, :string
      add :status, :string, null: false, default: "active"
      add :invitation_token, :string
      add :invitation_sent_at, :utc_datetime
      add :invited_by_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
    end

    # ponytail: coaches.user_id was never NOT NULL in the original create-table
    # migration, so no DROP NOT NULL execute is needed here.

    create unique_index(:coaches, ["business_id", "lower(email)"],
             where: "email IS NOT NULL",
             name: :coaches_business_id_lower_email_index
           )

    # One coach row per user, globally — login resolves a single business (spec F3).
    create unique_index(:coaches, [:user_id], where: "user_id IS NOT NULL")
    create unique_index(:coaches, [:invitation_token], where: "invitation_token IS NOT NULL")

    alter table(:clients) do
      add :assigned_coach_id, references(:coaches, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:clients, [:business_id, :assigned_coach_id])

    # Backfill: every existing client → the owner's coach row (created at signup).
    # Businesses with no owner coach row leave nil (fail closed: owner still sees).
    execute """
    UPDATE clients SET assigned_coach_id = co.id
    FROM businesses b
    JOIN coaches co ON co.business_id = b.id AND co.user_id = b.owner_id
    WHERE clients.business_id = b.id
    """
  end

  def down do
    alter table(:clients), do: remove(:assigned_coach_id)
    drop index(:coaches, [:invitation_token])
    drop index(:coaches, [:user_id])
    drop index(:coaches, [:business_id], name: :coaches_business_id_lower_email_index)

    alter table(:coaches) do
      remove :email
      remove :status
      remove :invitation_token
      remove :invitation_sent_at
      remove :invited_by_id
    end
  end
end
