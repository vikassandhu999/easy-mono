defmodule Easy.Identity.OneTimeTokens do
  alias Easy.Identity.OneTimeToken
  alias Easy.Identity.User
  alias Easy.Repo

  import Ecto.Query

  @spec with_issuance_lock(String.t(), (-> {:ok, result} | {:error, error})) ::
          {:ok, result} | {:error, error}
        when result: var, error: var
  def with_issuance_lock(email, fun) do
    Repo.transact(fn ->
      # Invitations may have neither a user nor an old token row to lock.
      Repo.query!("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["easy:otp:" <> email])
      fun.()
    end)
  end

  @spec create_token(User.t(), OneTimeToken.token_type(), String.t()) ::
          {:ok, OneTimeToken.t()}
          | {:error, Ecto.Changeset.t()}
  def create_token(user, token_type, otp) do
    insert_token(user.id, token_type, generate_token_hash(user.email <> otp), user.email)
  end

  @spec lock_by_hash(String.t(), OneTimeToken.token_type()) ::
          {:ok, OneTimeToken.t()}
          | {:error, :token_not_found}
  def lock_by_hash(token_hash, token_type) do
    query =
      OneTimeToken.matching_hash(token_hash, token_type)
      |> OneTimeToken.include_user()
      |> limit(1)
      |> lock("FOR UPDATE")

    case Repo.one(query) do
      nil -> {:error, :token_not_found}
      token -> {:ok, token}
    end
  end

  @spec delete(OneTimeToken.t()) ::
          {:ok, OneTimeToken.t()} | {:error, Ecto.Changeset.t()}
  def delete(token) do
    Repo.delete(token)
  end

  @spec delete_user_tokens(User.t(), OneTimeToken.token_type()) :: :ok
  def delete_user_tokens(user, token_type) do
    user.id
    |> OneTimeToken.issued_to_user(token_type)
    |> Repo.delete_all()

    :ok
  end

  @spec delete_all_for_relates_to_and_type(String.t(), OneTimeToken.token_type()) :: :ok
  def delete_all_for_relates_to_and_type(relates_to, token_type) do
    relates_to
    |> OneTimeToken.issued_for(token_type)
    |> Repo.delete_all()

    :ok
  end

  @spec create_invitation_acceptance_token(String.t(), String.t(), String.t()) ::
          {:ok, OneTimeToken.t()} | {:error, Ecto.Changeset.t()}
  def create_invitation_acceptance_token(otp, email, invitation_token) do
    insert_token(nil, :invitation_acceptance, invitation_acceptance_hash(otp, email, invitation_token), email)
  end

  defp insert_token(user_id, token_type, token_hash, relates_to) do
    attrs = %{token_type: token_type, token_hash: token_hash, relates_to: relates_to}

    user_id
    |> OneTimeToken.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec invitation_acceptance_hash(String.t(), String.t(), String.t()) :: String.t()
  def invitation_acceptance_hash(otp, email, invitation_token) do
    generate_token_hash(otp <> "|" <> email <> "|" <> invitation_token)
  end

  @spec generate_token_hash(String.t()) :: String.t()
  def generate_token_hash(token) do
    :crypto.hash(:sha256, token)
    |> Base.encode16(case: :lower)
  end
end
