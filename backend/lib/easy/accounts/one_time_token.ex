defmodule Easy.Accounts.OneTimeToken do
  @moduledoc """
  One-Time Token for OTP-based authentication flows.

  Used for:
  - Authentication (unified signup/signin OTP flow)
  - Invitation acceptance (coach/client invitations)
  - Phone/email verification
  - Password reset tokens
  - MFA setup and login
  - Account deletion, business transfer, payment confirmation

  Tokens are marked as 'used' after successful verification to prevent reuse.
  """

  use Ecto.Schema
  import Ecto.Query
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "one_time_tokens" do
    # Purpose
    field :token_type, Ecto.Enum,
      values: [
        :authentication,
        :invitation_acceptance,
        :phone_verification,
        :email_verification,
        :coach_invitation,
        :account_deletion,
        :business_transfer,
        :payment_confirmation,
        :session_verification,
        :mfa_setup,
        :mfa_login
      ]

    # Base for OTP generation
    field :secret, :string

    # Expiration
    field :expires_at, :utc_datetime

    # Track usage
    field :used, :boolean, default: false
    field :used_at, :utc_datetime

    # Contact info
    field :relates_to_email, :string
    field :relates_to_phone, :string

    # Rate limiting
    field :attempt_count, :integer, default: 0
    field :last_attempt_at, :utc_datetime

    # Link to user (may be nil during signup)
    belongs_to :user, Easy.Accounts.User

    # Flexible metadata storage for token-specific data
    field :metadata, :map, default: %{}

    timestamps(type: :utc_datetime)
  end

  @doc """
  Creates changeset for new token.
  """
  def changeset(token, attrs) do
    token
    |> cast(attrs, [
      :token_type,
      :secret,
      :expires_at,
      :used,
      :used_at,
      :relates_to_email,
      :relates_to_phone,
      :attempt_count,
      :last_attempt_at,
      :user_id,
      :metadata
    ])
    |> validate_required([:token_type, :secret, :expires_at])
    |> validate_contact_info()
    |> validate_email_format()
    |> validate_phone_format()
    |> validate_expiry_in_future()
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Returns map of available token types.
  """
  def token_types do
    %{
      authentication: :authentication,
      invitation_acceptance: :invitation_acceptance,
      phone_verification: :phone_verification,
      email_verification: :email_verification,
      coach_invitation: :coach_invitation,
      account_deletion: :account_deletion,
      business_transfer: :business_transfer,
      payment_confirmation: :payment_confirmation,
      session_verification: :session_verification,
      mfa_setup: :mfa_setup,
      mfa_login: :mfa_login
    }
  end

  @doc """
  Marks token as used to prevent reuse.
  """
  def mark_as_used(token) do
    change(token, %{
      used: true,
      used_at: DateTime.utc_now() |> DateTime.truncate(:second)
    })
  end

  @doc """
  """
  def find_recent_auth_token(email, phone) do
    sixty_seconds_ago = DateTime.add(DateTime.utc_now(), -60, :second)

    query =
      from(t in __MODULE__,
        where: t.token_type == :authentication,
        where: t.used == false,
        where: t.inserted_at > ^sixty_seconds_ago
      )

    query =
      cond do
        not is_nil(email) and not is_nil(phone) ->
          from(t in query, where: t.relates_to_email == ^email or t.relates_to_phone == ^phone)

        not is_nil(email) ->
          from(t in query, where: t.relates_to_email == ^email)

        not is_nil(phone) ->
          from(t in query, where: t.relates_to_phone == ^phone)

        true ->
          query
      end

    Easy.Repo.one(query)
  end

  @doc """
  Increments attempt count for rate limiting.
  Used when wrong OTP is entered.
  """
  def increment_attempt(token) do
    change(token, %{
      attempt_count: (token.attempt_count || 0) + 1,
      last_attempt_at: DateTime.utc_now() |> DateTime.truncate(:second)
    })
  end

  @doc """
  Checks if token is valid (not expired, not used).
  """
  def valid?(%__MODULE__{} = token) do
    not_expired?(token) and not token.used
  end

  @doc """
  Checks if token has not expired.
  """
  def not_expired?(%__MODULE__{expires_at: expires_at}) do
    DateTime.compare(DateTime.utc_now(), expires_at) == :lt
  end

  # ============================================
  # PRIVATE VALIDATIONS
  # ============================================

  defp validate_contact_info(changeset) do
    email = get_field(changeset, :relates_to_email)
    phone = get_field(changeset, :relates_to_phone)

    if is_nil(email) and is_nil(phone) do
      add_error(changeset, :relates_to_email, "either email or phone must be provided")
    else
      changeset
    end
  end

  defp validate_email_format(changeset) do
    case get_field(changeset, :relates_to_email) do
      nil ->
        changeset

      _email ->
        validate_format(changeset, :relates_to_email, ~r/^[^\s]+@[^\s]+$/,
          message: "must be a valid email address"
        )
    end
  end

  defp validate_phone_format(changeset) do
    case get_field(changeset, :relates_to_phone) do
      nil ->
        changeset

      _phone ->
        validate_format(changeset, :relates_to_phone, ~r/^\+?[1-9]\d{1,14}$/,
          message: "must be a valid phone number in E.164 format"
        )
    end
  end

  defp validate_expiry_in_future(changeset) do
    case get_change(changeset, :expires_at) do
      nil ->
        changeset

      expires_at ->
        if DateTime.compare(expires_at, DateTime.utc_now()) == :gt do
          changeset
        else
          add_error(changeset, :expires_at, "must be in the future")
        end
    end
  end

  @doc """
  Gets a valid (not expired, not used) token by ID and type.
  Used during OTP verification.
  """
  def get_valid_token(token_id, token_type) do
    from(t in __MODULE__,
      where: t.id == ^token_id,
      where: t.token_type == ^token_type,
      where: t.used == false,
      where: t.expires_at > ^DateTime.utc_now()
    )
    |> Easy.Repo.one()
  end
end
