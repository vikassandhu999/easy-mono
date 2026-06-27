defmodule Easy.Orgs.Coach do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Orgs.Business
  alias Easy.Repo

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coaches" do
    field :first_name, :string
    field :last_name, :string
    field :phone, :string

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Business

    timestamps(type: :utc_datetime)
  end

  # Changesets

  @spec insert_changeset(map()) :: Ecto.Changeset.t()
  def insert_changeset(attrs) do
    %__MODULE__{}
    |> cast(attrs, [:first_name, :last_name])
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(coach, attrs) do
    coach
    |> cast(attrs, [:first_name, :last_name, :phone])
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
  end

  @spec for_user(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  @spec include_preloads(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_preloads(query \\ __MODULE__, _business_id) do
    from(c in query, preload: [:user, :business])
  end

  # Actions

  @spec fetch(String.t(), String.t()) :: {:ok, t()} | {:error, Easy.Error.t()}
  def fetch(business_id, user_id) do
    case __MODULE__
         |> for_business(business_id)
         |> for_user(user_id)
         |> include_preloads(business_id)
         |> Repo.one() do
      nil -> {:error, Easy.Error.not_found("Coach not found")}
      coach -> {:ok, coach}
    end
  end

  @spec update_profile(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update_profile(%__MODULE__{} = coach, params) do
    coach_attrs = Map.take(params, [:first_name, :last_name, :phone])
    business_attrs = take_present(params, business_name: :name, whatsapp_number: :whatsapp_number)

    Repo.transaction(fn ->
      updated_coach =
        case coach |> update_changeset(coach_attrs) |> Repo.update() do
          {:ok, c} -> c
          {:error, changeset} -> Repo.rollback(changeset)
        end

      updated_business =
        if business_attrs == %{} do
          coach.business
        else
          case coach.business |> Business.update_changeset(business_attrs) |> Repo.update() do
            {:ok, b} -> b
            {:error, changeset} -> Repo.rollback(changeset)
          end
        end

      %{updated_coach | business: updated_business, user: coach.user}
    end)
  end

  # Only forward business fields the caller actually sent, so a coach-only profile edit
  # never blanks the business name/whatsapp.
  defp take_present(params, mapping) do
    Enum.reduce(mapping, %{}, fn {param_key, column}, acc ->
      if Map.has_key?(params, param_key) do
        Map.put(acc, column, params[param_key])
      else
        acc
      end
    end)
  end

  @spec full_name(t()) :: String.t()
  def full_name(%__MODULE__{first_name: first, last_name: last}) do
    [first, last]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
    |> String.trim()
  end
end
