defmodule Easy.Storefront.Lead do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Storefront.Offer

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @lead_statuses [:new, :contacted, :converted, :rejected]

  schema "leads" do
    field :name, :string
    field :email, :string
    field :phone, :string
    field :instagram_handle, :string
    field :intake_answers, :map, default: %{}
    field :status, Ecto.Enum, values: @lead_statuses, default: :new
    field :notes, :string
    field :source, :string

    belongs_to :business, Easy.Orgs.Business
    belongs_to :offer, Offer
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :email, :phone, :instagram_handle, :intake_answers, :source]

  # Changesets

  @spec insert_changeset(map(), String.t(), String.t() | nil) :: Ecto.Changeset.t()
  def insert_changeset(attrs, business_id, offer_id \\ nil) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> maybe_put_offer_id(offer_id)
    |> validate_required([:name, :email, :phone, :business_id])
    |> validate_format(:email, ~r/@/)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(lead, attrs) do
    lead
    |> cast(attrs, [:status, :notes])
    |> validate_inclusion(:status, @lead_statuses)
  end

  defp maybe_put_offer_id(changeset, nil), do: changeset
  defp maybe_put_offer_id(changeset, offer_id), do: put_change(changeset, :offer_id, offer_id)

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(l in query, where: l.business_id == ^business_id)
  end

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, status), do: from(l in query, where: l.status == ^status)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(l in query, order_by: [desc: l.inserted_at])
  end

  @spec with_preloads(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_preloads(query \\ __MODULE__) do
    from(l in query, preload: [:offer, :client])
  end

  # Actions

  @spec create(map(), String.t(), String.t() | nil) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(attrs, business_id, offer_id \\ nil) do
    attrs
    |> insert_changeset(business_id, offer_id)
    |> Repo.insert()
    |> preload_result()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(lead, attrs) do
    lead
    |> update_changeset(attrs)
    |> Repo.update()
    |> preload_result()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(lead), do: Repo.delete(lead)

  @spec convert(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t() | :already_converted}
  def convert(%{status: :converted}, _coach), do: {:error, :already_converted}

  def convert(lead, coach) do
    Repo.transaction(fn ->
      client_attrs = %{
        email: lead.email,
        first_name: lead.name,
        phone: lead.phone
      }

      case Client.invite_changeset(coach, client_attrs) |> Repo.insert() do
        {:ok, client} ->
          case lead
               |> change(%{status: :converted, client_id: client.id})
               |> Repo.update() do
            {:ok, updated_lead} -> Repo.preload(updated_lead, [:offer, :client], force: true)
            {:error, changeset} -> Repo.rollback(changeset)
          end

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  defp preload_result({:ok, record}), do: {:ok, Repo.preload(record, [:offer, :client])}
  defp preload_result(error), do: error
end
