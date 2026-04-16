defmodule Easy.Identity.OneTimeTokens do
  alias Easy.Identity
  alias Easy.Repo

  import Ecto.Query

  @spec create_token(Identity.User.t(), atom(), String.t()) ::
          {:ok, Identity.OneTimeToken.t()}
          | {:error, any()}
  def create_token(user, token_type, otp) do
    %{
      token_type: token_type,
      token_hash: generate_token_hash(user.email <> otp),
      relates_to: user.email,
      user_id: user.id
    }
    |> Identity.OneTimeToken.changeset()
    |> Repo.insert()
  end

  @spec get_by_hash(String.t(), atom()) ::
          {:ok, Identity.OneTimeToken.t()}
          | {:error, any()}
  def get_by_hash(token_hash, token_type) do
    query =
      from(t in Identity.OneTimeToken,
        where:
          t.token_hash == ^token_hash and
            t.token_type == ^token_type,
        limit: 1,
        preload: [:user]
      )

    case Repo.one(query) do
      nil -> {:error, :token_not_found}
      token -> {:ok, token}
    end
  end

  def delete(token) do
    Repo.delete(token)
  end

  @spec delete_all_for_user_and_type(Identity.User.t(), atom()) :: :ok
  def delete_all_for_user_and_type(user, token_type) do
    Repo.delete_all(
      from(t in Identity.OneTimeToken,
        where: t.user_id == ^user.id and t.token_type == ^token_type
      )
    )

    :ok
  end

  @spec delete_all_for_relates_to_and_type(String.t(), atom()) :: :ok
  def delete_all_for_relates_to_and_type(relates_to, token_type) do
    Repo.delete_all(
      from(t in Identity.OneTimeToken,
        where: t.relates_to == ^relates_to and t.token_type == ^token_type
      )
    )

    :ok
  end

  @spec create_invitation_acceptance_token(String.t(), String.t(), String.t()) ::
          {:ok, Identity.OneTimeToken.t()} | {:error, any()}
  def create_invitation_acceptance_token(otp, email, invitation_token) do
    %{
      token_type: :invitation_acceptance,
      token_hash: invitation_acceptance_hash(otp, email, invitation_token),
      relates_to: email
    }
    |> Identity.OneTimeToken.changeset()
    |> Repo.insert()
  end

  @spec invitation_acceptance_hash(String.t(), String.t(), String.t()) :: String.t()
  def invitation_acceptance_hash(otp, email, invitation_token) do
    generate_token_hash(otp <> "|" <> email <> "|" <> invitation_token)
  end

  @spec invitation_acceptance_token_expired?(Identity.OneTimeToken.t()) :: boolean()
  def invitation_acceptance_token_expired?(%Identity.OneTimeToken{inserted_at: inserted_at}) do
    otp_validity_minutes = 10
    NaiveDateTime.diff(NaiveDateTime.utc_now(), inserted_at, :minute) > otp_validity_minutes
  end

  @spec generate_token_hash(String.t()) :: String.t()
  def generate_token_hash(token) do
    :crypto.hash(:sha256, token)
    |> Base.encode16(case: :lower)
  end
end
