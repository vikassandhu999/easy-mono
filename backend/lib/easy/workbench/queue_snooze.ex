defmodule Easy.Workbench.QueueSnooze do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}
  @type queue :: :quiet | :expiring

  schema "workbench_queue_snoozes" do
    field :queue, Ecto.Enum, values: [:quiet, :expiring]
    field :snoozed_until, :date

    belongs_to :business, Orgs.Business
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:queue, :snoozed_until])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:business_id, :client_id, :queue, :snoozed_until])
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id)
    |> check_constraint(:queue, name: :workbench_queue_snoozes_queue_check)
    |> unique_constraint([:business_id, :client_id, :queue])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(s in query, where: s.business_id == ^business_id)

  @spec for_queue(Ecto.Queryable.t(), queue()) :: Ecto.Query.t()
  def for_queue(query \\ __MODULE__, queue), do: from(s in query, where: s.queue == ^queue)

  # A snooze in force: rows are never deleted, they simply expire, so
  # reappearance in the queue is automatic (spec: quiet-queue sub-spec).
  @spec active(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__, today), do: from(s in query, where: s.snoozed_until >= ^today)
end
