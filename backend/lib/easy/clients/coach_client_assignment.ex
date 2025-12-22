defmodule Easy.Clients.CoachClientAssignment do
  @moduledoc """
  CoachClientAssignment schema representing the many-to-many relationship
  between coaches and clients.

  This join table tracks which coaches are assigned to which clients,
  along with assignment metadata like timestamps and who created the assignment.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coach_client_assignments" do
    field :assigned_at, :utc_datetime
    field :assigned_by_id, :binary_id

    belongs_to :coach, Easy.Organizations.Coach
    belongs_to :client, Easy.Clients.Client

    timestamps()
  end

  def changeset(assignment, attrs) do
    assignment
    |> cast(attrs, [:coach_id, :client_id, :assigned_at, :assigned_by_id])
    |> validate_required([:coach_id, :client_id])
    |> put_assigned_at()
    |> foreign_key_constraint(:coach_id)
    |> foreign_key_constraint(:client_id)
    |> unique_constraint([:coach_id, :client_id],
      name: :coach_client_assignments_unique_index,
      message: "coach is already assigned to this client"
    )
  end

  defp put_assigned_at(changeset) do
    case get_field(changeset, :assigned_at) do
      nil -> put_change(changeset, :assigned_at, DateTime.utc_now() |> DateTime.truncate(:second))
      _ -> changeset
    end
  end
end
