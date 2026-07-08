defmodule Easy.Repo.Migrations.AddSessionActorClaims do
  use Ecto.Migration

  def change do
    alter table(:user_sessions) do
      # No FK: claims cache copied from coaches at session-issue time, not a live relation.
      add :coach_id, :binary_id
      add :is_owner, :boolean, null: false, default: false
    end
  end
end
