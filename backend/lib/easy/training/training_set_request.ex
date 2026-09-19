defmodule Easy.Training.TrainingSetRequest do
  use Ecto.Schema

  alias Easy.Training.TrainingPerformedSet

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @type identity :: %{id: String.t(), fingerprint: binary()}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "training_set_requests" do
    field :request_id, Ecto.UUID
    field :fingerprint, :binary
    field :business_id, Ecto.UUID
    field :training_session_id, Ecto.UUID
    field :performed_set_id, Ecto.UUID
    timestamps(type: :utc_datetime)
  end

  @spec identity(map()) :: {:ok, identity() | nil} | {:error, Ecto.Changeset.t()}
  def identity(attrs) do
    with {:ok, fields} <- {%{}, %{request_id: Ecto.UUID}} |> cast(attrs, [:request_id]) |> apply_action(:validate) do
      identity_for_id(Map.get(fields, :request_id), attrs)
    end
  end

  defp identity_for_id(nil, _attrs), do: {:ok, nil}

  defp identity_for_id(id, attrs) do
    with {:ok, fingerprint} <- TrainingPerformedSet.creation_fingerprint(attrs) do
      {:ok, %{id: id, fingerprint: fingerprint}}
    end
  end

  @spec insert_changeset(TrainingPerformedSet.t(), identity()) :: Ecto.Changeset.t()
  def insert_changeset(set, identity) do
    %__MODULE__{}
    |> change(%{
      business_id: set.business_id,
      training_session_id: set.training_session_id,
      performed_set_id: set.id,
      request_id: identity.id,
      fingerprint: identity.fingerprint
    })
    |> validate_required([:business_id, :training_session_id, :performed_set_id, :request_id, :fingerprint])
    |> unique_constraint(:request_id, name: :training_set_requests_identity_index)
    |> foreign_key_constraint(:training_session_id, name: :training_set_requests_session_business_id_fkey)
    |> foreign_key_constraint(:performed_set_id, name: :training_set_requests_set_scope_fkey)
  end

  @spec for_session(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, business_id, session_id) do
    from(request in query, where: request.business_id == ^business_id and request.training_session_id == ^session_id)
  end
end
