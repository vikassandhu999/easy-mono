defmodule Easy.Orgs.Business do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.LocalCalendar
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  @reserved ~w(admin api app www auth login signup support help billing settings assets static coach client coaches clients)
  schema "businesses" do
    field :default_review_frequency_days, :integer, default: 7
    field :default_tracker_template_id, :binary_id
    field :name, :string
    field :handle, :string
    field :timezone, :string, default: LocalCalendar.default_timezone()
    field :seats_used, :integer, virtual: true, default: 0
    has_one :billing, Easy.Billing.BusinessBilling
    belongs_to :owner, Easy.Identity.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime)
  end

  @spec owned_by(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def owned_by(query \\ __MODULE__, business_id, user_id), do: from(b in query, where: b.id == ^business_id and b.owner_user_id == ^user_id)
  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(user_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :handle, :timezone])
    |> put_change(:owner_user_id, user_id)
    |> validate_profile()
    |> foreign_key_constraint(:owner_user_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(business, attrs), do: business |> cast(attrs, [:name, :handle, :timezone]) |> validate_profile()
  @spec valid_handle?(String.t()) :: boolean()
  def valid_handle?(handle) when is_binary(handle), do: String.length(handle) in 3..40 and Regex.match?(~r/^[a-z0-9]+(-[a-z0-9]+)*$/, handle) and handle not in @reserved
  def valid_handle?(_), do: false

  defp validate_profile(changeset) do
    changeset
    |> validate_required([:name, :handle, :timezone])
    |> validate_length(:name, max: 255, count: :codepoints)
    |> validate_change(:handle, fn :handle, handle ->
      if valid_handle?(handle), do: [], else: [handle: "use 3–40 lowercase letters, digits and single hyphens; reserved handles are unavailable"]
    end)
    |> LocalCalendar.validate_timezone()
    |> unique_constraint(:handle, name: :businesses_handle_index)
    |> check_constraint(:handle, name: :businesses_handle_check)
  end
end
