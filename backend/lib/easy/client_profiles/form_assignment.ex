defmodule Easy.ClientProfiles.FormAssignment do
  use Ecto.Schema

  alias Easy.ClientProfiles.FormTemplate
  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @purposes ["intake", "weekly_check_in", "nutrition_update", "training_update", "custom"]
  @assignment_statuses ["assigned", "in_progress", "completed", "dismissed"]
  @priorities ["high", "normal"]

  @type t :: %__MODULE__{}

  schema "form_assignments" do
    field :purpose, :string
    field :priority, :string, default: "normal"
    field :status, :string, default: "assigned"
    field :due_date, :date
    field :completed_at, :utc_datetime

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :form_template, FormTemplate

    has_many :form_submissions, Easy.ClientProfiles.FormSubmission

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, form_template_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:purpose, :priority, :status, :due_date, :completed_at])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:form_template_id, form_template_id)
    |> validate_required([:business_id, :client_id, :form_template_id, :purpose, :priority, :status])
    |> validate_inclusion(:purpose, @purposes)
    |> validate_inclusion(:priority, @priorities)
    |> validate_inclusion(:status, @assignment_statuses)
    |> check_constraint(:purpose, name: :form_assignments_purpose_check)
    |> check_constraint(:priority, name: :form_assignments_priority_check)
    |> check_constraint(:status, name: :form_assignments_status_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:form_template_id)
    |> foreign_key_constraint(:client_id, name: :form_assignments_client_business_id_fkey)
    |> foreign_key_constraint(:form_template_id, name: :form_assignments_template_business_id_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(assignment, attrs) do
    assignment
    |> cast(attrs, [:priority, :status, :due_date])
    |> validate_required([:purpose, :priority, :status])
    |> validate_inclusion(:purpose, @purposes)
    |> validate_inclusion(:priority, @priorities)
    |> validate_inclusion(:status, @assignment_statuses)
    |> check_constraint(:purpose, name: :form_assignments_purpose_check)
    |> check_constraint(:priority, name: :form_assignments_priority_check)
    |> check_constraint(:status, name: :form_assignments_status_check)
  end

  @spec complete_changeset(t(), DateTime.t()) :: Ecto.Changeset.t()
  def complete_changeset(assignment, completed_at) do
    assignment
    |> change(status: "completed", completed_at: completed_at)
    |> validate_required([:purpose, :priority, :status, :completed_at])
    |> validate_inclusion(:status, @assignment_statuses)
    |> check_constraint(:status, name: :form_assignments_status_check)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(a in query, where: a.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, client_id) do
    from(a in query, where: a.client_id == ^client_id)
  end
end
