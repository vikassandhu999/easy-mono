defmodule Easy.Orgs.Business do
  use Ecto.Schema
  alias Easy.Identity.User
  alias Easy.LocalCalendar

  import Ecto.Changeset
  import Ecto.Query, only: [from: 2]

  @type t() :: %__MODULE__{}
  @type dashboard_setup_hidden_reason() :: :dismissed | :completed

  @dashboard_setup_hidden_reasons [:dismissed, :completed]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "businesses" do
    field :name, :string
    field :handle, :string
    field :about, :string
    field :whatsapp_number, :string
    field :dashboard_setup_hidden_at, :utc_datetime
    field :default_weight_unit, Ecto.Enum, values: [:kg, :lbs], default: :kg
    field :timezone, :string, default: LocalCalendar.default_timezone()

    field :dashboard_setup_hidden_reason, Ecto.Enum, values: @dashboard_setup_hidden_reasons

    belongs_to :owner, User

    timestamps(type: :utc_datetime)
  end

  @spec owned_by(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def owned_by(query \\ __MODULE__, business_id, owner_id) do
    from(business in query, where: business.id == ^business_id and business.owner_id == ^owner_id)
  end

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(owner_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :handle, :about, :default_weight_unit])
    |> validate_profile()
    |> put_change(:owner_id, owner_id)
    |> validate_required([:handle, :owner_id])
    |> validate_length(:handle, max: 255, count: :codepoints)
    |> unique_constraint(:handle)
    |> LocalCalendar.stamp_timezone()
    |> foreign_key_constraint(:owner_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(business, attrs) do
    business
    |> cast(attrs, [:name, :about, :whatsapp_number, :default_weight_unit, :timezone])
    |> validate_profile()
    |> validate_length(:whatsapp_number, max: 255, count: :codepoints)
    |> LocalCalendar.validate_timezone()
  end

  @spec dashboard_setup_input(map()) :: {:ok, map()} | {:error, Ecto.Changeset.t()}
  def dashboard_setup_input(attrs) when is_map(attrs) do
    changeset = cast(%__MODULE__{}, attrs, [])

    if Map.has_key?(changeset.params, "dashboard_setup_hidden_reason"),
      do: {:ok, changeset.params},
      else: {:error, missing_dashboard_setup_reason()}
  end

  def dashboard_setup_input(_attrs), do: {:error, missing_dashboard_setup_reason()}

  defp missing_dashboard_setup_reason do
    %__MODULE__{} |> change() |> add_error(:dashboard_setup_hidden_reason, "must be present")
  end

  @spec update_changeset(t(), :dashboard_setup, DateTime.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(%__MODULE__{dashboard_setup_hidden_reason: :completed} = business, :dashboard_setup, _now, _attrs) do
    change(business)
  end

  def update_changeset(business, :dashboard_setup, now, attrs) do
    business
    |> cast(attrs, [:dashboard_setup_hidden_reason])
    |> stamp_dashboard_setup(now)
    |> check_constraint(:dashboard_setup_hidden_reason,
      name: :businesses_dashboard_setup_hidden_reason_check
    )
    |> check_constraint(:dashboard_setup_hidden_at,
      name: :businesses_dashboard_setup_hidden_state_consistent
    )
  end

  @spec dashboard_setup_hidden_reasons() :: [dashboard_setup_hidden_reason()]
  def dashboard_setup_hidden_reasons, do: @dashboard_setup_hidden_reasons

  defp stamp_dashboard_setup(changeset, now) do
    hidden_at =
      case get_field(changeset, :dashboard_setup_hidden_reason) do
        nil -> nil
        _reason -> now
      end

    put_change(changeset, :dashboard_setup_hidden_at, hidden_at)
  end

  defp validate_profile(changeset) do
    changeset
    |> validate_required([:name, :default_weight_unit])
    |> validate_length(:name, max: 255, count: :codepoints)
    |> validate_length(:about, max: 255, count: :codepoints)
    |> check_constraint(:default_weight_unit, name: :businesses_default_weight_unit_check)
  end
end
