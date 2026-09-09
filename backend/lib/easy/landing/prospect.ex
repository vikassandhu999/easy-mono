defmodule Easy.Landing.Prospect do
  use Ecto.Schema

  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses [:new, :reviewing, :won, :lost]

  @type t :: %__MODULE__{}
  @type status :: :new | :reviewing | :won | :lost
  @type status_counts :: %{
          new: non_neg_integer(),
          reviewing: non_neg_integer(),
          won: non_neg_integer(),
          lost: non_neg_integer()
        }

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
    |> validate_string_lengths()
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
    |> validate_string_lengths()
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

  defp validate_string_lengths(changeset) do
    Enum.reduce([:name, :phone, :email, :instagram, :notes], changeset, fn field, changeset ->
      validate_length(changeset, field, max: 255, count: :codepoints)
    end)
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

  # The coach can edit the prefilled fields, so request attrs win; the prospect fills the gaps.
  @spec invitation_attrs(t(), map()) :: map()
  def invitation_attrs(%__MODULE__{} = prospect, attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)
    {default_first, default_last} = split_name(prospect.name)

    %{
      first_name: Map.get(attrs, "first_name") || default_first,
      last_name: Map.get(attrs, "last_name") || default_last,
      email: Map.get(attrs, "email") || prospect.email,
      phone: Map.get(attrs, "phone") || prospect.phone
    }
  end

  defp split_name(nil), do: {nil, nil}

  defp split_name(name) do
    case String.split(String.trim(name), ~r/\s+/, parts: 2) do
      [first, last] -> {first, last}
      [first] -> {first, nil}
      _ -> {nil, nil}
    end
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(p in query, where: p.business_id == ^business_id)
  end

  @spec for_status(Ecto.Queryable.t(), status() | String.t() | nil) :: Ecto.Query.t()
  def for_status(query \\ __MODULE__, status)
  def for_status(query, nil), do: query
  def for_status(query, ""), do: query
  def for_status(query, status), do: from(p in query, where: p.status == ^status)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(p in query, order_by: [desc: p.inserted_at, desc: p.id])
  end

  @spec select_status_counts(Ecto.Queryable.t()) :: Ecto.Query.t()
  def select_status_counts(query \\ __MODULE__) do
    from(p in query,
      select: %{
        new: filter(count(p.id), p.status == :new),
        reviewing: filter(count(p.id), p.status == :reviewing),
        won: filter(count(p.id), p.status == :won),
        lost: filter(count(p.id), p.status == :lost)
      }
    )
  end

  @spec include_details(Ecto.Queryable.t()) :: Ecto.Query.t()
  def include_details(query \\ __MODULE__) do
    from(p in query, preload: [:landing_program, :landing_page, :client])
  end
end
