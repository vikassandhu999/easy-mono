defmodule Easy.Clients.Client do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Orgs.Coaches
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @client_statuses [:active, :inactive, :invited]

  schema "clients" do
    field :email, :string
    field :first_name, :string
    field :last_name, :string
    field :phone, :string
    field :notes, :string

    field :status, Ecto.Enum, values: @client_statuses

    field :invitation_token, :string
    field :invitation_sent_at, :utc_datetime

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id

    timestamps()
  end

  @cast_fields [:email, :first_name, :last_name, :phone, :notes]

  # Changesets

  @spec invite_changeset(Orgs.Coach.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(coach, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, coach.business_id)
    |> validate_required([:email, :business_id])
    |> put_change(:status, :invited)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, DateTime.utc_now(:second))
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> put_assoc(:creator, coach)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, ""), do: query

  def search(query, term) do
    from(c in query,
      where:
        ilike(c.first_name, ^"%#{term}%") or
          ilike(c.last_name, ^"%#{term}%") or
          ilike(c.email, ^"%#{term}%")
    )
  end

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, status), do: from(c in query, where: c.status == ^status)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at])
  end

  @spec with_preloads(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_preloads(query \\ __MODULE__) do
    from(c in query, preload: [:user, :business, :creator])
  end

  # Actions

  @spec invite(map(), map()) :: {:ok, t()} | {:error, any()}
  def invite(claims, invite_attrs) when is_map(claims) do
    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, client} <- create_invitation(coach, invite_attrs),
         :ok <- send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  defp create_invitation(coach, invite_attrs) do
    coach
    |> invite_changeset(invite_attrs)
    |> Repo.insert()
  end

  defp send_invitation_email(client, coach) do
    business = Repo.preload(coach, :business).business

    email =
      Easy.Emails.client_invitation_email(
        client.email,
        client.invitation_token,
        coach.name || "Coach",
        business.name
      )

    Easy.MailerDelivery.deliver_async(email,
      metadata: %{email: client.email}
    )
  end

  defp generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end
end
