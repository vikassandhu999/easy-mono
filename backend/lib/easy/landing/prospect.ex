defmodule Easy.Landing.Prospect do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses [:new, :reviewing, :won, :lost]

  @type t :: %__MODULE__{}

  schema "prospects" do
    field :name, :string
    field :phone, :string
    field :email, :string
    field :instagram, :string
    field :answers, :map, default: %{}
    field :status, Ecto.Enum, values: @statuses, default: :new
    field :notes, :string

    belongs_to :business, Orgs.Business
    belongs_to :landing_page, Easy.Landing.LandingPage
    belongs_to :landing_program, Easy.Landing.LandingProgram
    belongs_to :client, Easy.Clients.Client

    timestamps(type: :utc_datetime)
  end

  # Public application: trusted ids (business_id, landing_page_id, optional program) come from
  # the resolved page, never the request body.
  @spec application_changeset(String.t(), String.t(), String.t() | nil, map()) :: Ecto.Changeset.t()
  def application_changeset(business_id, landing_page_id, landing_program_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :phone, :email, :instagram, :answers])
    |> put_change(:business_id, business_id)
    |> put_change(:landing_page_id, landing_page_id)
    |> put_change(:landing_program_id, landing_program_id)
    |> put_change(:status, :new)
    |> validate_required([:business_id, :landing_page_id, :name])
    |> validate_contact()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:landing_program_id, name: :prospects_program_business_id_fkey)
  end

  # Coach edits: status + notes only.
  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(prospect, attrs) do
    prospect
    |> cast(attrs, [:status, :notes])
    |> validate_required([:status])
    |> check_constraint(:status, name: :prospects_status_check)
  end

  @spec enroll_changeset(t(), String.t()) :: Ecto.Changeset.t()
  def enroll_changeset(prospect, client_id) do
    prospect
    |> change(%{status: :won})
    |> put_change(:client_id, client_id)
    |> foreign_key_constraint(:client_id, name: :prospects_client_business_id_fkey)
  end

  defp validate_contact(changeset) do
    phone = get_field(changeset, :phone)
    email = get_field(changeset, :email)

    if present?(phone) or present?(email) do
      changeset
    else
      add_error(changeset, :email, "provide a phone number or email")
    end
  end

  defp present?(value), do: is_binary(value) and String.trim(value) != ""

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_status(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Query.t()
  def for_status(query \\ __MODULE__, status)
  def for_status(query, nil), do: query
  def for_status(query, ""), do: query
  def for_status(query, status), do: from(p in query, where: p.status == ^status)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(p in query, order_by: [desc: p.inserted_at, desc: p.id])
  end
end
