defmodule Easy.Forms.FormAssignment do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Forms.FormSubmission
  alias Easy.Forms.FormTemplate
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @purposes [:intake, :check_in]
  @open_statuses [:assigned, :in_progress]
  @assignment_statuses @open_statuses ++ [:completed, :dismissed, :missed]
  @priorities [:high, :normal]

  @type purpose :: :intake | :check_in
  @type t :: %__MODULE__{}

  schema "form_assignments" do
    field :purpose, Ecto.Enum, values: @purposes
    field :priority, Ecto.Enum, values: @priorities, default: :normal
    field :status, Ecto.Enum, values: @assignment_statuses, default: :assigned
    field :due_date, :date
    field :completed_at, :utc_datetime
    field :due_reminder_sent_at, :utc_datetime
    field :overdue_reminder_sent_at, :utc_datetime
    field :latest_submission_reviewed_at, :utc_datetime, virtual: true
    field :latest_submission, :map, virtual: true

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :form_template, FormTemplate
    belongs_to :check_in_schedule, Easy.Forms.CheckInSchedule

    has_many :form_submissions, Easy.Forms.FormSubmission

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), purpose(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, form_template_id, purpose, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:priority, :due_date])
    |> put_change(:purpose, purpose)
    |> put_change(:status, :assigned)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:form_template_id, form_template_id)
    |> validate_required([:business_id, :client_id, :form_template_id, :purpose, :priority, :status])
    |> check_constraint(:purpose, name: :form_assignments_purpose_check)
    |> check_constraint(:priority, name: :form_assignments_priority_check)
    |> check_constraint(:status, name: :form_assignments_status_check)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :form_assignments_client_business_id_fkey)
    |> foreign_key_constraint(:form_template_id, name: :form_assignments_template_business_id_fkey)
  end

  @spec insert_scheduled_changeset(String.t(), String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_scheduled_changeset(business_id, client_id, form_template_id, check_in_schedule_id, attrs) do
    business_id
    |> insert_changeset(client_id, form_template_id, :check_in, attrs)
    |> put_change(:check_in_schedule_id, check_in_schedule_id)
    |> foreign_key_constraint(:check_in_schedule_id, name: :form_assignments_schedule_business_id_fkey)
  end

  @spec check_expected_status(t(), map()) :: :ok | {:error, :assignment_changed | Ecto.Changeset.t()}
  def check_expected_status(assignment, attrs) do
    types = %{expected_status: __schema__(:type, :status)}
    changeset = cast({%{}, types}, attrs, [:expected_status])

    with {:ok, input} <- apply_action(changeset, :update) do
      case Map.fetch(input, :expected_status) do
        :error -> :ok
        {:ok, status} when status == assignment.status -> :ok
        {:ok, _status} -> {:error, :assignment_changed}
      end
    end
  end

  @spec update_changeset(t(), DateTime.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(assignment, now, attrs) do
    assignment
    |> cast(attrs, [:priority, :status, :due_date])
    |> validate_required([:purpose, :priority, :status])
    |> sync_completed_at(now)
    |> check_constraint(:purpose, name: :form_assignments_purpose_check)
    |> check_constraint(:priority, name: :form_assignments_priority_check)
    |> check_constraint(:status, name: :form_assignments_status_check)
  end

  # Keep completed_at consistent with status so a coach edit can't leave a "completed"
  # assignment with a nil completed_at (or a stale stamp after re-opening it).
  defp sync_completed_at(changeset, now) do
    completed_at = get_field(changeset, :completed_at)

    case get_field(changeset, :status) do
      :completed when is_nil(completed_at) ->
        put_change(changeset, :completed_at, now)

      :completed ->
        changeset

      _other when not is_nil(completed_at) ->
        put_change(changeset, :completed_at, nil)

      _other ->
        changeset
    end
  end

  @spec complete_changeset(t(), DateTime.t()) :: Ecto.Changeset.t()
  def complete_changeset(assignment, completed_at) do
    assignment
    |> change(status: :completed, completed_at: completed_at)
    |> validate_required([:purpose, :priority, :status, :completed_at])
    |> check_constraint(:status, name: :form_assignments_status_check)
  end

  @spec reminder_sent_changeset(t(), :due | :overdue, DateTime.t()) :: Ecto.Changeset.t()
  def reminder_sent_changeset(assignment, :due, sent_at), do: change(assignment, due_reminder_sent_at: sent_at)
  def reminder_sent_changeset(assignment, :overdue, sent_at), do: change(assignment, overdue_reminder_sent_at: sent_at)

  @spec put_latest_submission(t() | nil) :: t() | nil
  def put_latest_submission(nil), do: nil

  def put_latest_submission(%__MODULE__{form_submissions: submissions} = assignment)
      when is_list(submissions) do
    latest_submission = List.first(submissions)

    %{
      assignment
      | latest_submission: latest_submission,
        latest_submission_reviewed_at: submission_reviewed_at(latest_submission)
    }
  end

  def put_latest_submission(%__MODULE__{} = assignment), do: assignment

  defp submission_reviewed_at(nil), do: nil
  defp submission_reviewed_at(submission), do: submission.reviewed_at

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__), do: from(a in query, order_by: [asc: a.inserted_at, asc: a.id])

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(a in query, where: a.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(a in query, where: a.business_id == ^business_id and a.client_id == ^client_id)
  end

  @spec for_schedule(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_schedule(query \\ __MODULE__, business_id, schedule_id) do
    from(a in query, where: a.business_id == ^business_id and a.check_in_schedule_id == ^schedule_id)
  end

  @spec open(Ecto.Queryable.t()) :: Ecto.Query.t()
  def open(query \\ __MODULE__), do: from(a in query, where: a.status in @open_statuses)

  @spec open?(t()) :: boolean()
  def open?(%__MODULE__{status: status}), do: status in @open_statuses

  @spec latest_due_check_in_per_client(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def latest_due_check_in_per_client(query \\ __MODULE__, today) do
    from(assignment in query,
      where:
        assignment.purpose == :check_in and
          not is_nil(assignment.due_date) and assignment.due_date <= ^today,
      distinct: assignment.client_id,
      order_by: [
        asc: assignment.client_id,
        desc: assignment.due_date,
        desc: assignment.inserted_at,
        desc: assignment.id
      ]
    )
  end

  @spec pending_check_in_reminder(Ecto.Queryable.t(), :due | :overdue, Date.t()) :: Ecto.Query.t()
  def pending_check_in_reminder(query \\ __MODULE__, type, today) do
    query
    |> open()
    |> where([assignment], assignment.purpose == :check_in)
    |> reminder_window(type, today)
  end

  defp reminder_window(query, :due, today) do
    cutoff = Date.add(today, -2)

    from(assignment in query,
      where:
        assignment.due_date <= ^today and assignment.due_date > ^cutoff and
          is_nil(assignment.due_reminder_sent_at)
    )
  end

  defp reminder_window(query, :overdue, today) do
    cutoff = Date.add(today, -2)

    from(assignment in query,
      where: assignment.due_date <= ^cutoff and is_nil(assignment.overdue_reminder_sent_at)
    )
  end

  @spec include_form_template(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_form_template(query \\ __MODULE__, business_id) do
    from(a in query,
      join: template in FormTemplate,
      on: template.id == a.form_template_id and template.business_id == ^business_id,
      preload: [form_template: template]
    )
  end

  @spec include_submission_reviews(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_submission_reviews(query \\ __MODULE__, business_id) do
    submissions = FormSubmission |> FormSubmission.for_business(business_id) |> FormSubmission.newest()
    from(a in query, preload: [form_submissions: ^submissions])
  end

  @spec include_client(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_client(query \\ __MODULE__) do
    from(a in query,
      join: client in Client,
      on: client.id == a.client_id and client.business_id == a.business_id,
      preload: [client: client]
    )
  end
end
