defmodule Easy.Nutrition.DiaryCommandLedger do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @retention_days 30

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_diary_command_ledger" do
    field :idempotency_key, :binary_id
    field :fingerprint, :string
    field :outcome, :binary
    field :expires_at, :utc_datetime

    belongs_to :business, Orgs.Business
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end

  @spec retention_days() :: pos_integer()
  def retention_days, do: @retention_days

  @spec fingerprint(String.t(), String.t(), map()) :: String.t()
  def fingerprint(method, path, payload) when is_binary(method) and is_binary(path) and is_map(payload) do
    :sha256
    |> :crypto.hash(:erlang.term_to_binary({method, path, payload}, [:deterministic]))
    |> Base.encode16(case: :lower)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:idempotency_key, :fingerprint, :outcome, :expires_at])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:idempotency_key, :fingerprint, :expires_at, :business_id, :client_id])
    |> unique_constraint(:idempotency_key, name: :nutrition_diary_command_ledger_client_key_index)
    |> foreign_key_constraint(:client_id, name: :nutrition_diary_command_ledger_client_business_id_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(ledger, attrs) do
    ledger
    |> cast(attrs, [:outcome])
    |> validate_required([:outcome])
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(row in query, where: row.business_id == ^business_id)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(row in query, where: row.business_id == ^business_id and row.client_id == ^client_id)
  end

  @spec lock_key(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def lock_key(query \\ __MODULE__, key) do
    from(row in query, where: row.idempotency_key == ^key, lock: "FOR UPDATE")
  end

  @spec expired(Ecto.Queryable.t(), DateTime.t()) :: Ecto.Query.t()
  def expired(query \\ __MODULE__, %DateTime{} = now) do
    from(row in query, where: row.expires_at < ^now)
  end
end
