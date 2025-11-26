defmodule EasyWeb.AuthController do
  alias Easy.Organizations
  alias Easy.Repo
  use EasyWeb, :controller

  alias EasyWeb.Registration
  alias Easy.{Accounts}

  def register(conn, params) do
    changeset = Registration.changeset(%Registration{}, params)

    if changeset.valid? do
      registration = Ecto.Changeset.apply_changes(changeset)
      user_attrs = Registration.to_user_attrs(registration)
      business_attrs = Registration.to_business_attrs(registration)

      with {:ok, result} <-
             Accounts.register(user_attrs, business_attrs) do
        conn
        |> put_status(:ok)
        |> json(%{
          user: %{
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name
          },
          token: %{
            token_id: result.token.id
          }
        })
        |> halt()
      end
    else
      {:error, Error.unprocessable(changeset)}
    end
  end

  def verify(conn, %{"token_id" => token_id, "code" => code}) do
    with {:ok, user} <- Accounts.verify_email(token_id, code, "email_verification"),
         {:ok, %{access_token: access_token, refresh_token: refresh_token}} <-
           Accounts.create_coach_access_token(user) do
      conn
      |> put_status(:ok)
      |> json(%{
        access_token: access_token,
        refresh_token: refresh_token
      })
      |> halt()
    end
  end

  def verify(_conn, _params) do
    {:error, Error.unprocessable("token_id and code are required")}
  end

  def send_login_code(conn, %{"email" => email}) do
    with {:ok, result} <- Accounts.send_login_code(email) do
      conn
      |> put_status(:ok)
      |> json(%{
        user: %{
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name
        },
        token: %{
          token_id: result.token.id
        }
      })
      |> halt()
    end
  end

  def send_login_code(_conn, _params) do
    {:error, Error.unprocessable("email is required")}
  end

  def token(conn, %{"token_id" => token_id, "code" => code}) do
    with {:ok, %{access_token: access_token, refresh_token: refresh_token}} <-
           Accounts.login(token_id, code) do
      conn
      |> put_status(:ok)
      |> json(%{
        access_token: access_token,
        refresh_token: refresh_token
      })
      |> halt()
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def token(conn, %{"refresh_token" => refresh_token}) do
    with {:ok, %{access_token: access_token, refresh_token: new_refresh_token}} <-
           Accounts.refresh_access_token(refresh_token) do
      conn
      |> put_status(:ok)
      |> json(%{
        access_token: access_token,
        refresh_token: new_refresh_token
      })
      |> halt()
    end
  end

  def token(_conn, _params) do
    {:error, Error.unprocessable("code or refresh_token is required")}
  end

  def client_signup(conn, %{
        "token_id" => token_id,
        "code" => code,
        "invitation_token" => invitation_token
      }) do
    with {:ok, user} <- Accounts.verify_email(token_id, code, "email_verification"),
         {:ok, result} <- Easy.Clients.complete_client_signup(invitation_token, user.id) do
      conn
      |> put_status(:ok)
      |> json(%{
        user: format_user_with_client(result.user, result.client),
        session: %{
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        }
      })
      |> halt()
    else
      {:error, :invalid_token} ->
        {:error, Error.not_found("Invitation not found or invalid")}

      {:error, :token_expired} ->
        {:error, Error.new(:invitation_expired, "This invitation has expired", %{}, :gone)}

      {:error, :user_not_found} ->
        {:error, Error.not_found("User not found")}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def client_signup(_conn, _params) do
    {:error, Error.unprocessable("token_id, code, and invitation_token are required")}
  end

  defp format_user_with_client(user, client) do
    %{
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      email_verified: user.email_verified,
      roles: ["client"],
      client_profile: %{
        id: client.id,
        business_id: client.business_id,
        business_name: client.business.name,
        status: client.status,
        full_name: client.full_name,
        phone: client.phone,
        assigned_coaches: format_coaches(client.coaches)
      }
    }
  end

  defp format_coaches(coaches) do
    Enum.map(coaches, fn coach ->
      %{
        id: coach.id,
        user: %{
          full_name: Easy.Accounts.User.full_name(coach.user)
        }
      }
    end)
  end

  def me(conn, _params) do
    with claims <- conn.assigns.token_claims,
         user_id <- claims["sub"],
         %Accounts.User{} = user <- Repo.get(Accounts.User, user_id) do
      response = %{
        user: %{
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          email_verified: user.email_verified
        }
      }

      # Check for coach profile
      response =
        case Accounts.get_coach_by_user(user) do
          %Organizations.Coach{} = coach ->
            Map.merge(response, %{
              coach: %{
                id: coach.id,
                business_id: coach.business_id
              }
            })

          nil ->
            response
        end

      # Check for client profile
      response =
        case Accounts.get_client_by_user(user) do
          %Easy.Clients.Client{} = client ->
            Map.merge(response, %{
              client_profile: %{
                id: client.id,
                business_id: client.business_id,
                status: client.status
              }
            })

          nil ->
            response
        end

      conn
      |> put_status(:ok)
      |> json(response)
      |> halt()
    end
  end
end
