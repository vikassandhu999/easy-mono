defmodule Easy.Clients.Client do
  use Ecto.Schema

  alias Easy.Orgs
  alias Easy.Orgs.Coaches
  alias Easy.Repo
  alias Easy.Storefront.Offer

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @client_statuses [:active, :inactive, :pending, :expired, :archived]
  @payment_statuses [:free, :paid, :partial, :pending]
  @expiring_days 7

  schema "clients" do
    field :email, :string
    field :first_name, :string
    field :last_name, :string
    field :phone, :string
    field :notes, :string
    field :instagram_handle, :string

    field :status, Ecto.Enum, values: @client_statuses

    # Program tracking
    field :program_name, :string
    field :program_start, :date
    field :program_end, :date

    # Payment tracking
    field :payment_status, Ecto.Enum, values: @payment_statuses
    field :payment_amount, :integer
    field :payment_currency, :string, default: "INR"
    field :payment_notes, :string

    # Intake
    field :intake_answers, :map, default: %{}
    field :source, :string

    # Status override (bypasses auto-computation when set)
    field :status_override, :string

    # Invitation
    field :invitation_token, :string
    field :invitation_sent_at, :utc_datetime

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Orgs.Business
    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :offer, Offer

    timestamps()
  end

  @invite_cast_fields [:email, :first_name, :last_name, :phone, :notes, :instagram_handle]
  @update_cast_fields [
    :first_name,
    :last_name,
    :phone,
    :notes,
    :instagram_handle,
    :program_name,
    :program_start,
    :program_end,
    :payment_status,
    :payment_amount,
    :payment_currency,
    :payment_notes,
    :status_override
  ]
  @inquiry_cast_fields [
    :email,
    :first_name,
    :last_name,
    :phone,
    :instagram_handle,
    :intake_answers
  ]

  # Changesets

  @spec invite_changeset(Orgs.Coach.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(coach, attrs) do
    %__MODULE__{}
    |> cast(attrs, @invite_cast_fields)
    |> put_change(:business_id, coach.business_id)
    |> put_change(:source, "invite")
    |> validate_required([:business_id])
    |> validate_email_or_phone()
    |> put_change(:status, :pending)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, DateTime.utc_now(:second))
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> put_assoc(:creator, coach)
  end

  @spec inquiry_changeset(String.t(), map(), Offer.t() | nil) :: Ecto.Changeset.t()
  def inquiry_changeset(business_id, attrs, offer \\ nil) do
    %__MODULE__{}
    |> cast(attrs, @inquiry_cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:source, "storefront")
    |> put_change(:status, :pending)
    |> maybe_set_offer(offer)
    |> validate_required([:first_name, :email, :phone, :business_id])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> unique_constraint(:email, name: :clients_business_id_email_index)
  end

  defp maybe_set_offer(changeset, nil), do: changeset

  defp maybe_set_offer(changeset, %Offer{} = offer) do
    changeset
    |> put_change(:offer_id, offer.id)
    |> put_change(:program_name, offer.name)
    |> put_change(:payment_amount, offer.price)
    |> put_change(:payment_currency, offer.currency || "INR")
  end

  @status_override_values Enum.map(@client_statuses, &Atom.to_string/1)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(client, attrs) do
    client
    |> cast(attrs, @update_cast_fields)
    |> validate_inclusion(:status_override, @status_override_values,
      message: "must be one of: #{Enum.join(@status_override_values, ", ")}"
    )
    |> validate_number(:payment_amount, greater_than_or_equal_to: 0)
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

  @spec accept_invite_changeset(t(), String.t()) :: Ecto.Changeset.t()
  def accept_invite_changeset(client, user_id) do
    client
    |> change(%{
      user_id: user_id,
      status: :active,
      invitation_token: nil
    })
  end

  @spec get_for_user(String.t(), String.t()) :: {:ok, t()} | {:error, :not_found}
  def get_for_user(business_id, user_id) do
    case __MODULE__ |> for_business(business_id) |> for_user(user_id) |> Repo.one() do
      nil -> {:error, :not_found}
      client -> {:ok, client}
    end
  end

  # Queries for invitation

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

  # Status auto-computation

  @status_override_map Map.new(@client_statuses, &{Atom.to_string(&1), &1})

  @spec compute_status(t()) :: atom()
  def compute_status(%__MODULE__{status_override: override}) when is_binary(override) do
    Map.get(@status_override_map, override, :inactive)
  end

  def compute_status(%__MODULE__{} = client) do
    today = Date.utc_today()

    cond do
      client.status == :pending ->
        :pending

      client.status == :archived ->
        :archived

      not is_nil(client.program_end) and Date.compare(client.program_end, today) == :lt ->
        :expired

      not is_nil(client.program_end) and
          Date.diff(client.program_end, today) <= @expiring_days ->
        :expiring

      not is_nil(client.program_end) or not is_nil(client.program_start) or
          not is_nil(client.program_name) ->
        :active

      client.status == :active ->
        :active

      true ->
        :inactive
    end
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(c in query, where: c.business_id == ^business_id)
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

  @spec with_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_status(query \\ __MODULE__, status)
  def with_status(query, nil), do: query
  def with_status(query, status), do: from(c in query, where: c.status == ^status)

  @spec with_payment_status(Ecto.Queryable.t(), atom() | nil) :: Ecto.Query.t()
  def with_payment_status(query \\ __MODULE__, payment_status)
  def with_payment_status(query, nil), do: query

  def with_payment_status(query, payment_status),
    do: from(c in query, where: c.payment_status == ^payment_status)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(c in query, order_by: [desc: c.inserted_at])
  end

  @spec with_preloads(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_preloads(query \\ __MODULE__) do
    from(c in query, preload: [:user, :business, :creator, :offer])
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

  @spec create_inquiry(String.t(), map(), Offer.t() | nil) ::
          {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create_inquiry(business_id, attrs, offer \\ nil) do
    business_id
    |> inquiry_changeset(attrs, offer)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(client, attrs) do
    client
    |> update_changeset(attrs)
    |> Repo.update()
  end

  @spec summary(Ecto.Queryable.t()) :: map()
  def summary(query) do
    today = Date.utc_today()
    expiring_threshold = Date.add(today, @expiring_days)

    counts =
      from(c in query,
        select: %{
          active:
            count(
              fragment(
                """
                CASE WHEN ? IS NULL AND ? NOT IN ('archived', 'pending', 'inactive') AND (
                  (? IS NOT NULL OR ? IS NOT NULL OR ? IS NOT NULL)
                  AND (? IS NULL OR ? > ?)
                ) THEN 1 END
                """,
                c.status_override,
                c.status,
                c.program_end,
                c.program_start,
                c.program_name,
                c.program_end,
                c.program_end,
                ^expiring_threshold
              )
            ) +
              count(
                fragment(
                  "CASE WHEN ? = 'active' AND ? IS NULL AND ? IS NULL AND ? IS NULL AND ? IS NULL THEN 1 END",
                  c.status,
                  c.program_end,
                  c.program_start,
                  c.program_name,
                  c.status_override
                )
              ),
          expiring:
            count(
              fragment(
                "CASE WHEN ? IS NOT NULL AND ? >= ? AND ? <= ? AND ? NOT IN ('pending', 'archived') AND ? IS NULL THEN 1 END",
                c.program_end,
                c.program_end,
                ^today,
                c.program_end,
                ^expiring_threshold,
                c.status,
                c.status_override
              )
            ),
          pending:
            count(
              fragment(
                "CASE WHEN ? = 'pending' AND ? IS NULL THEN 1 END",
                c.status,
                c.status_override
              )
            ),
          expired:
            count(
              fragment(
                "CASE WHEN ? IS NOT NULL AND ? < ? AND ? NOT IN ('pending', 'archived') AND ? IS NULL THEN 1 END",
                c.program_end,
                c.program_end,
                ^today,
                c.status,
                c.status_override
              )
            ),
          payment_due:
            count(
              fragment(
                "CASE WHEN ? IN ('pending', 'partial') THEN 1 END",
                c.payment_status
              )
            )
        }
      )
      |> Repo.one()

    counts || %{active: 0, expiring: 0, pending: 0, expired: 0, payment_due: 0}
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

  defp generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end
end
