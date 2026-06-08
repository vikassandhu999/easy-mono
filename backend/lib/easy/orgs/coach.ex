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

  @spec with_preloads(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_preloads(query \\ __MODULE__) do
    from(c in query, preload: [:user, :business])
  end

  # Actions

  @spec get_for_user(String.t(), String.t()) :: {:ok, t()} | {:error, Easy.Error.t()}
  def get_for_user(business_id, user_id) do
    case __MODULE__
         |> for_business(business_id)
         |> for_user(user_id)
         |> with_preloads()
         |> Repo.one() do
      nil -> {:error, Easy.Error.not_found("Coach not found")}
      coach -> {:ok, coach}
    end
  end

  @spec update_profile(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update_profile(%__MODULE__{} = coach, params) do
    coach_attrs = Map.take(params, ["first_name", "last_name", "phone"])
    business_name = params["business_name"]

    Repo.transaction(fn ->
      updated_coach =
        case coach |> update_changeset(coach_attrs) |> Repo.update() do
          {:ok, c} -> c
          {:error, changeset} -> Repo.rollback(changeset)
        end

      updated_business =
        if business_name do
          case coach.business
               |> Business.update_changeset(%{"name" => business_name})
               |> Repo.update() do
            {:ok, b} -> b
            {:error, changeset} -> Repo.rollback(changeset)
          end
        else
          coach.business
        end

      %{updated_coach | business: updated_business, user: coach.user}
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
