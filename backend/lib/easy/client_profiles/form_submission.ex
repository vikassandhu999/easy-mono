defmodule Easy.ClientProfiles.FormSubmission do
  use Ecto.Schema

  alias Easy.ClientProfiles.FormAssignment
  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @actors [:coach, :client, :system]

  @type t :: %__MODULE__{}

  schema "form_submissions" do
    field :question_snapshot, {:array, :map}, default: []
    field :answers, :map, default: %{}
    field :submitted_by_type, Ecto.Enum, values: @actors
    field :submitted_by_id, :binary_id
    field :submitted_at, :utc_datetime

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :form_assignment, FormAssignment

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), atom(), binary() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, form_assignment_id, submitted_by_type, submitted_by_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:question_snapshot, :answers, :submitted_at])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:form_assignment_id, form_assignment_id)
    |> put_change(:submitted_by_type, submitted_by_type)
    |> put_change(:submitted_by_id, submitted_by_id)
    |> validate_required([
      :business_id,
      :client_id,
      :form_assignment_id,
      :question_snapshot,
      :answers,
      :submitted_by_type,
      :submitted_at
    ])
    |> check_constraint(:submitted_by_type, name: :form_submissions_submitted_by_type_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :form_submissions_client_business_id_fkey)
    |> foreign_key_constraint(:form_assignment_id,
      name: :form_submissions_assignment_client_business_id_fkey
    )
  end

  @spec for_assignment(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_assignment(query \\ __MODULE__, business_id, assignment_id) do
    from(s in query, where: s.business_id == ^business_id and s.form_assignment_id == ^assignment_id)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(s in query, order_by: [desc: s.submitted_at])
  end
end
