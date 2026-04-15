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

  @statuses [:active, :pending, :inactive, :archived]

  schema "clients" do
    field :email, :string
    field :first_name, :string
    field :last_name, :string
    field :phone, :string
    field :notes, :string

    field :status, Ecto.Enum, values: @statuses

    # Invitation
    field :invitation_token, :string
    field :invitation_sent_at, :utc_datetime

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id

    timestamps()
  end

  @invite_cast_fields [:email, :first_name, :last_name, :phone, :notes]
  @update_cast_fields [:first_name, :last_name, :phone, :email, :notes, :status]
  @self_update_cast_fields [:first_name, :last_name, :phone]
  @inquiry_cast_fields [:email, :first_name, :last_name, :phone]

  # Changesets

  @spec invite_changeset(Orgs.Coach.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(coach, attrs) do
    %__MODULE__{}
    |> cast(attrs, @invite_cast_fields)
    |> put_change(:business_id, coach.business_id)
    |> validate_required([:business_id])
    |> validate_email_or_phone()
    |> put_change(:status, :pending)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, DateTime.utc_now(:second))
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> put_assoc(:creator, coach)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(client, attrs) do
    client
    |> cast(attrs, @update_cast_fields)
    |> validate_inclusion(:status, @statuses)
  end

  @spec self_update_changeset(t(), map()) :: Ecto.Changeset.t()
  def self_update_changeset(client, attrs) do
    client
    |> cast(attrs, @self_update_cast_fields)
  end

  @spec inquiry_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def inquiry_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @inquiry_cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:status, :pending)
    |> validate_required([:first_name, :email, :phone, :business_id])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> unique_constraint(:email, name: :clients_business_id_email_index)
  end

  @spec accept_invite_changeset(t(), String.t()) :: Ecto.Changeset.t()
  def accept_invite_changeset(client, user_id) do
    client
    |> change(%{
      user_id: user_id,
      status: :active,
      invitation_token: nil
    })
  end

  defp validate_email_or_phone(changeset) do
    email = get_field(changeset, :email)
    phone = get_field(changeset, :phone)

    if blank?(email) and blank?(phone) do
      add_error(changeset, :base, "at least one of email or phone is required")
    else
      changeset
    end
  end

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false

  # Queries

  @spec get_for_user(String.t(), String.t()) :: {:ok, t()} | {:error, :not_found}
  def get_for_user(business_id, user_id) do
    case __MODULE__ |> for_business(business_id) |> for_user(user_id) |> Repo.one() do
      nil -> {:error, :not_found}
      client -> {:ok, client}
    end
  end

  @spec get_by_invitation_token(String.t()) :: t() | nil
  def get_by_invitation_token(token) do
    __MODULE__
    |> where([c], c.invitation_token == ^token and c.status == :pending)
    |> Repo.one()
  end

  @spec for_user(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
  end

  @spec accepted(Ecto.Queryable.t()) :: Ecto.Query.t()
  def accepted(query \\ __MODULE__) do
    from(c in query, where: c.status == :active)
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query

  def search(query, term) do
    from(c in query,
      where:
        ilike(c.first_name, ^"%#{term}%") or
          ilike(c.last_name, ^"%#{term}%") or
          ilike(c.email, ^"%#{term}%") or
          ilike(c.phone, ^"%#{term}%")
    )
  end

  @spec with_status(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, ""), do: query

  def with_status(query, status) when is_binary(status) do
    from(c in query, where: c.status == ^status)
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at])
  end

  @spec with_preloads(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_preloads(query \\ __MODULE__) do
    from(c in query, preload: [:user, :business, :creator])
  end

  @spec accessible?(String.t(), String.t()) :: boolean()
  def accessible?(business_id, client_id) do
    __MODULE__
    |> for_business(business_id)
    |> Repo.get(client_id)
    |> is_struct(__MODULE__)
  end

  # Actions

  @spec invite(map(), map()) :: {:ok, t()} | {:error, any()}
  def invite(claims, invite_attrs) when is_map(claims) do
    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, client} <- create_invitation(coach, invite_attrs),
         :ok <- maybe_send_invitation_email(client, coach) do
      {:ok, client}
    end
  end

  @spec create_inquiry(String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create_inquiry(business_id, attrs) do
    business_id
    |> inquiry_changeset(attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(client, attrs) do
    client
    |> update_changeset(attrs)
    |> Repo.update()
  end

  @spec get_profile(String.t(), String.t()) ::
          {:ok, %{client: t(), coach: Orgs.Coach.t()}} | {:error, :not_found}
  def get_profile(business_id, user_id) do
    with {:ok, client} <- get_for_user(business_id, user_id) do
      coach =
        Orgs.Coach
        |> Orgs.Coach.for_business(business_id)
        |> Orgs.Coach.with_preloads()
        |> Repo.one()

      {:ok, %{client: client, coach: coach}}
    end
  end

  @spec self_update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def self_update(client, attrs) do
    client
    |> self_update_changeset(attrs)
    |> Repo.update()
  end

  @spec summary(Ecto.Queryable.t()) :: map()
  def summary(query) do
    counts =
      from(c in query,
        select: %{
          active: count(fragment("CASE WHEN ? = 'active' THEN 1 END", c.status)),
          pending: count(fragment("CASE WHEN ? = 'pending' THEN 1 END", c.status)),
          inactive: count(fragment("CASE WHEN ? = 'inactive' THEN 1 END", c.status)),
          archived: count(fragment("CASE WHEN ? = 'archived' THEN 1 END", c.status))
        }
      )
      |> Repo.one()

    counts || %{active: 0, pending: 0, inactive: 0, archived: 0}
  end

  @spec resend_invitation(t(), Orgs.Coach.t()) :: {:ok, t()} | {:error, Easy.Error.t()}
  def resend_invitation(%__MODULE__{status: :pending, email: email} = client, coach)
      when is_binary(email) and email != "" do
    case client |> change(%{invitation_sent_at: DateTime.utc_now(:second)}) |> Repo.update() do
      {:ok, updated} ->
        maybe_send_invitation_email(updated, coach)
        {:ok, updated}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def resend_invitation(%__MODULE__{status: :pending, email: nil}, _coach) do
    {:error, Easy.Error.unprocessable(%{email: ["client has no email address"]})}
  end

  def resend_invitation(%__MODULE__{status: :pending, email: ""}, _coach) do
    {:error, Easy.Error.unprocessable(%{email: ["client has no email address"]})}
  end

  def resend_invitation(%__MODULE__{}, _coach) do
    {:error, Easy.Error.unprocessable(%{status: ["client is not in pending status"]})}
  end

  @spec build_invite_url(t()) :: String.t() | nil
  def build_invite_url(%__MODULE__{invitation_token: nil}), do: nil

  def build_invite_url(%__MODULE__{invitation_token: token}) do
    base_url =
      Application.get_env(:easy, :client_frontend_url, "http://localhost:1313")

    "#{base_url}/invite/#{token}"
  end

  defp create_invitation(coach, invite_attrs) do
    coach
    |> invite_changeset(invite_attrs)
    |> Repo.insert()
  end

  defp maybe_send_invitation_email(%__MODULE__{email: nil}, _coach), do: :ok
  defp maybe_send_invitation_email(%__MODULE__{email: ""}, _coach), do: :ok

  defp maybe_send_invitation_email(client, coach) do
    business = Repo.preload(coach, :business).business
    coach_name = Easy.Orgs.Coach.full_name(coach)

    email =
      Easy.Emails.client_invitation_email(
        client.email,
        client.invitation_token,
        if(coach_name == "", do: "Coach", else: coach_name),
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
