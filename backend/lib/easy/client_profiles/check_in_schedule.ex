defmodule Easy.ClientProfiles.CheckInSchedule do
  use Ecto.Schema

  alias Easy.ClientProfiles.FormTemplate
  alias Easy.Clients.Client
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @frequencies [:once, :weekly, :biweekly, :monthly]

  @type t :: %__MODULE__{}

  schema "check_in_schedules" do
    field :frequency, Ecto.Enum, values: @frequencies
    field :next_due_on, :date
    field :active, :boolean, default: true

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :form_template, FormTemplate

    has_many :form_assignments, Easy.ClientProfiles.FormAssignment

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, form_template_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:frequency, :next_due_on, :active])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:form_template_id, form_template_id)
    |> validate_required([:business_id, :client_id, :form_template_id, :frequency, :next_due_on, :active])
    |> check_constraint(:frequency, name: :check_in_schedules_frequency_check)
    |> unique_constraint(:client_id, name: :check_in_schedules_one_active_index)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :check_in_schedules_client_business_id_fkey)
    |> foreign_key_constraint(:form_template_id, name: :check_in_schedules_template_business_id_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(schedule, attrs) do
    schedule
    |> cast(attrs, [:frequency, :next_due_on, :active])
    |> validate_required([:frequency, :next_due_on, :active])
    |> check_constraint(:frequency, name: :check_in_schedules_frequency_check)
    |> unique_constraint(:client_id, name: :check_in_schedules_one_active_index)
  end

  @spec advance(t()) :: {Date.t(), boolean()}
  def advance(%__MODULE__{frequency: :once, next_due_on: next_due_on}), do: {next_due_on, false}
  def advance(%__MODULE__{frequency: :weekly, next_due_on: next_due_on}), do: {Date.add(next_due_on, 7), true}
  def advance(%__MODULE__{frequency: :biweekly, next_due_on: next_due_on}), do: {Date.add(next_due_on, 14), true}
  def advance(%__MODULE__{frequency: :monthly, next_due_on: next_due_on}), do: {Date.shift(next_due_on, month: 1), true}

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id), do: from(s in query, where: s.business_id == ^business_id)

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(s in query, where: s.business_id == ^business_id and s.client_id == ^client_id)
  end

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__), do: from(s in query, where: s.active)

  @spec due_on_or_before(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def due_on_or_before(query \\ __MODULE__, date), do: from(s in query, where: s.next_due_on <= ^date)

  @spec include_template(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_template(query \\ __MODULE__, business_id) do
    from(s in query,
      preload: [form_template: ^from(t in FormTemplate, where: t.business_id == ^business_id)]
    )
  end
end
