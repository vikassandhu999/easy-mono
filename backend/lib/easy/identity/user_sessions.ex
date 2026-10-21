defmodule Easy.Identity.UserSessions do
  import Ecto.Query

  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Repo

  @refresh_token_expiration 7 * 24 * 60 * 60
  @refresh_token_bytes 64

  @spec create_session(User.t(), UserSession.scope(), map()) ::
          {:ok, UserSession.t()} | {:error, Ecto.Changeset.t()}
  def create_session(user, scope, attrs) do
    session_attrs =
      attrs
      |> Map.merge(%{
        expires_at: DateTime.add(DateTime.utc_now(), @refresh_token_expiration, :second),
        refresh_token: generate_refresh_token()
      })

    user.id
    |> UserSession.insert_changeset(scope, session_attrs)
    |> Repo.insert()
  end

  @spec get_by_refresh_token(String.t()) :: {:ok, UserSession.t()} | {:error, :session_not_found}
  def get_by_refresh_token(refresh_token) do
    case Repo.get_by(UserSession, refresh_token: refresh_token) do
      nil -> {:error, :session_not_found}
      session -> {:ok, session}
    end
  end

  @spec refresh_session(UserSession.t(), UserSession.scope(), map()) ::
          {:ok, UserSession.t()} | {:error, Ecto.Changeset.t()}
  def refresh_session(%UserSession{} = session, scope, attrs) do
    session
    |> UserSession.update_changeset(scope, DateTime.utc_now(:second), attrs)
    |> Repo.update()
  end

  @spec revoke_user_sessions(String.t()) :: {:ok, non_neg_integer()}
  def revoke_user_sessions(user_id) do
    {count, _} =
      from(s in UserSession, where: s.user_id == ^user_id and is_nil(s.revoked_at))
      |> Repo.update_all(set: [revoked_at: DateTime.utc_now(:second)])

    {:ok, count}
  end

  @spec validate_access(map()) :: :ok | {:error, :invalid_token}
  def validate_access(%{"session_id" => session_id, "user_id" => user_id} = claims) do
    with {:ok, session_id} <- Ecto.UUID.cast(session_id),
         {:ok, user_id} <- Ecto.UUID.cast(user_id),
         %UserSession{} = session <- Repo.get_by(UserSession, id: session_id, user_id: user_id),
         false <- UserSession.revoked?(session),
         false <- UserSession.expired?(session, DateTime.utc_now()),
         true <- matching_scope?(session, claims) do
      :ok
    else
      _ -> {:error, :invalid_token}
    end
  end

  def validate_access(_claims), do: {:error, :invalid_token}

  defp matching_scope?(session, claims) do
    Atom.to_string(session.role) == claims["role"] and
      session.business_id == claims["business_id"] and
      session.coach_id == claims["coach_id"] and
      session.is_owner == (claims["is_owner"] == true)
  end

  defp generate_refresh_token do
    :crypto.strong_rand_bytes(@refresh_token_bytes)
    |> Base.url_encode64(padding: false)
    |> String.downcase()
  end
end
