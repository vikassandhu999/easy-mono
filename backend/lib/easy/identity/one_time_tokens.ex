defmodule Easy.Identity.OneTimeTokens do
  alias Easy.Identity.OneTimeToken
  alias Easy.Repo

  import Ecto.Query

  @spec create_token(Easy.Identity.User.t(), atom(), String.t()) ::
          {:ok, OneTimeToken.t()}
          | {:error, any()}
  def create_token(user, token_type, otp) do
    %{
      token_type: token_type,
      token_hash: generate_token_hash(user.email <> otp),
      relates_to: user.email,
      user_id: user.id
    }
    |> OneTimeToken.changeset()
    |> Repo.insert()
  end

  @spec get_by_hash(String.t(), atom()) ::
          {:ok, Easy.Identity.OneTimeToken.t()}
          | {:error, any()}
  def get_by_hash(token_hash, token_type) do
    query =
      from(t in OneTimeToken,
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

  @spec delete_all_for_user_and_type(Easy.Identity.User.t(), atom()) :: :ok
  def delete_all_for_user_and_type(user, token_type) do
    Repo.delete_all(
      from(t in OneTimeToken,
        where: t.user_id == ^user.id and t.token_type == ^token_type
      )
    )

    :ok
  end

  @spec generate_token_hash(String.t()) :: String.t()
  def generate_token_hash(token) do
    :crypto.hash(:sha256, token)
    |> Base.encode16(case: :lower)
  end
end
