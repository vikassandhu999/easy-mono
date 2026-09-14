defmodule Easy.Repo.Migrations.KeepEnrolledApplicationsAccepted do
  use Ecto.Migration

  def up do
    execute """
    UPDATE prospects SET status = 'won', revision = revision + 1,
      updated_at = date_trunc('second', now())
    WHERE client_id IS NOT NULL AND status <> 'won'
    """

    create constraint(:prospects, :prospects_enrolled_status_check,
             check: "client_id IS NULL OR status = 'won'"
           )
  end

  def down do
    drop constraint(:prospects, :prospects_enrolled_status_check)
  end
end
