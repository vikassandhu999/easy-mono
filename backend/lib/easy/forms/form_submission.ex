defmodule Easy.Forms.FormSubmission do
  use Ecto.Schema

  alias Easy.Attachments.Attachment
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Identity.User
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @actors [:coach, :client, :system]

  @type actor :: :coach | :client | :system
  @type t :: %__MODULE__{attachments: [Attachment.t()]}

  schema "form_submissions" do
    field :question_snapshot, {:array, :map}, default: []
    field :answers, :map, default: %{}
    field :submitted_by_type, Ecto.Enum, values: @actors
    field :submitted_by_id, :binary_id
    field :submitted_at, :utc_datetime
    field :reviewed_at, :utc_datetime
    field :attachments, {:array, :map}, virtual: true, default: []

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :form_assignment, FormAssignment
    belongs_to :reviewed_by, User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), actor(), binary() | nil, map()) :: Ecto.Changeset.t()
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

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(s in query, where: s.business_id == ^business_id and s.client_id == ^client_id)
  end

  @spec include_form_assignment(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_form_assignment(query \\ __MODULE__) do
    from(s in query,
      join: assignment in FormAssignment,
      on:
        assignment.id == s.form_assignment_id and assignment.business_id == s.business_id and
          assignment.client_id == s.client_id,
      join: template in Easy.Forms.FormTemplate,
      on: template.id == assignment.form_template_id and template.business_id == s.business_id,
      preload: [form_assignment: {assignment, form_template: template}]
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(s in query, where: s.business_id == ^business_id)
  end

  @spec unreviewed(Ecto.Queryable.t()) :: Ecto.Query.t()
  def unreviewed(query \\ __MODULE__), do: from(s in query, where: is_nil(s.reviewed_at))

  @spec for_check_ins(Ecto.Queryable.t()) :: Ecto.Query.t()
  def for_check_ins(query \\ __MODULE__) do
    from(s in query,
      join: assignment in FormAssignment,
      as: :review_assignment,
      on:
        assignment.id == s.form_assignment_id and assignment.business_id == s.business_id and
          assignment.purpose == :check_in
    )
  end

  @spec for_visible_clients(Ecto.Queryable.t(), Ctx.t()) :: Ecto.Query.t()
  def for_visible_clients(query \\ __MODULE__, %Ctx{} = ctx) do
    visible_clients = Client |> Client.for_business(ctx.business_id) |> Client.visible_to(ctx)

    from(s in query,
      join: client in ^visible_clients,
      as: :review_client,
      on: client.id == s.client_id and client.business_id == s.business_id
    )
  end

  @spec awaiting_check_in_review(Ecto.Queryable.t(), Ctx.t()) :: Ecto.Query.t()
  def awaiting_check_in_review(query \\ __MODULE__, %Ctx{} = ctx) do
    query
    |> for_business(ctx.business_id)
    |> unreviewed()
    |> for_check_ins()
    |> for_visible_clients(ctx)
  end

  @spec include_review_context(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_review_context(query \\ __MODULE__, business_id) do
    from([s, review_assignment: assignment, review_client: client] in query,
      join: template in Easy.Forms.FormTemplate,
      on: template.id == assignment.form_template_id and template.business_id == ^business_id,
      preload: [client: client, form_assignment: {assignment, form_template: template}]
    )
  end

  @spec review_changeset(t(), String.t(), DateTime.t()) :: Ecto.Changeset.t()
  def review_changeset(submission, reviewed_by_id, reviewed_at) do
    submission
    |> change(reviewed_by_id: reviewed_by_id, reviewed_at: reviewed_at)
    |> validate_required([:reviewed_by_id, :reviewed_at])
    |> foreign_key_constraint(:reviewed_by_id)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(s in query, order_by: [desc: s.submitted_at, desc: s.id])
  end

  @spec oldest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def oldest(query \\ __MODULE__) do
    from(s in query, order_by: [asc: s.submitted_at, asc: s.id])
  end
end
