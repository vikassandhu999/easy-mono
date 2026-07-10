defmodule Easy.Repo.Migrations.AddDashboardSetupStateToBusinesses do
  use Ecto.Migration

  def change do
    alter table(:businesses) do
      add :dashboard_setup_hidden_at, :utc_datetime
      add :dashboard_setup_hidden_reason, :string
    end

    create constraint(
             :businesses,
             :businesses_dashboard_setup_hidden_reason_check,
             check:
               "dashboard_setup_hidden_reason IS NULL OR dashboard_setup_hidden_reason IN ('dismissed', 'completed')"
           )

    create constraint(
             :businesses,
             :businesses_dashboard_setup_hidden_state_consistent,
             check:
               "(dashboard_setup_hidden_at IS NULL) = (dashboard_setup_hidden_reason IS NULL)"
           )
  end
end
