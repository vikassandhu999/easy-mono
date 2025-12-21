defmodule EasyWeb.InvitationController do
  use EasyWeb, :controller

  require Logger

  alias Easy.Clients
  alias Easy.Accounts
  alias Easy.Accounts.User
  alias Easy.Repo

  def validate_invitation(conn, %{"invitation_token" => invitation_token}) do
    case Clients.get_invitation_with_coach(invitation_token) do
      {:ok, %{client: client, inviting_coach: coach}} ->
        coach_info =
          if coach do
            %{
              id: coach.id,
              full_name: User.full_name(coach.user),
              email: coach.user.email
            }
          else
            nil
          end

        json(conn, %{
          valid: true,
          invitation: %{
            email: client.email,
            full_name: client.full_name,
            expires_at: client.invitation_expires_at
          },
          business: %{
            id: client.business.id,
            name: client.business.name
          },
          inviting_coach: coach_info
        })

      {:error, :invalid_token} ->
        conn
        |> put_status(:not_found)
        |> json(%{valid: false, error: "Invitation not found or invalid"})

      {:error, :token_expired} ->
        conn
        |> put_status(:gone)
        |> json(%{valid: false, error: "This invitation has expired"})

      {:error, _reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{valid: false, error: "An internal error occurred"})
    end
  end

  def validate_invitation(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "invitation_token is required"})
  end

  def accept_invitation(
        conn,
        %{"invitation_token" => invitation_token, "email" => email} = params
      ) do
    Repo.transaction(fn ->
      with {:ok, %{client: client, inviting_coach: _coach}} <-
             Clients.get_invitation_with_coach(invitation_token),
           :ok <- validate_email_matches(client.email, email),
           {:ok, user} <- find_or_create_user(email, params),
           {:ok, updated_client} <- link_user_to_client(client, user),
           {:ok, session_data} <- Accounts.create_client_session(user) do
        # Preload associations for response
        client_with_associations = Repo.preload(updated_client, [:business, coaches: [:user]])

        %{
          access_token: session_data.access_token,
          refresh_token: session_data.refresh_token,
          expires_at: session_data.expires_at,
          expires_in: session_data.expires_in,
          user: %{
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            email_verified: user.email_verified
          },
          client: %{
            id: client_with_associations.id,
            email: client_with_associations.email,
            full_name: client_with_associations.full_name,
            status: client_with_associations.status,
            business_id: client_with_associations.business_id
          }
        }
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, result} ->
        json(conn, result)

      {:error, :invalid_token} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Invitation not found or invalid"})

      {:error, :token_expired} ->
        conn
        |> put_status(:gone)
        |> json(%{error: "This invitation has expired"})

      {:error, :email_mismatch} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Email does not match the invitation"})

      {:error, :missing_user_details} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "first_name and last_name are required for new users"})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Validation failed", details: format_changeset_errors(changeset)})

      {:error, %Easy.Error{} = error} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: error.message})

      {:error, reason} ->
        Logger.error("Failed to accept invitation: #{inspect(reason)}")

        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to accept invitation"})
    end
  end

  def accept_invitation(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "invitation_token and email are required"})
  end

  # Private helpers

  defp validate_email_matches(invitation_email, provided_email) do
    if String.downcase(invitation_email) == String.downcase(provided_email) do
      :ok
    else
      {:error, :email_mismatch}
    end
  end

  defp find_or_create_user(email, params) do
    case Repo.get_by(User, email: String.downcase(email)) do
      %User{} = user ->
        # User exists, mark email as verified since they're accepting an invitation
        user
        |> User.verify_email_changeset()
        |> Repo.update()

      nil ->
        # Create new user
        create_new_user(email, params)
    end
  end

  defp create_new_user(email, params) do
    first_name = params["first_name"]
    last_name = params["last_name"]

    if is_nil(first_name) or is_nil(last_name) do
      {:error, :missing_user_details}
    else
      user_attrs = %{
        email: email,
        first_name: first_name,
        last_name: last_name,
        email_verified: true
      }

      Accounts.create_user(user_attrs)
    end
  end

  defp link_user_to_client(client, user) do
    client
    |> Clients.Client.link_user_changeset(user.id)
    |> Ecto.Changeset.change(%{
      invitation_token: nil,
      invitation_expires_at: nil,
      status: "active"
    })
    |> Repo.update()
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
