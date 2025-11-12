defmodule EasyWeb.AuthController do
  use EasyWeb, :controller

  alias EasyWeb.Registration
  alias Easy.{Accounts}

  @spec register(
          any(),
          :invalid | %{optional(:__struct__) => none(), optional(atom() | binary()) => any()}
        ) :: {:error, any()} | Plug.Conn.t()
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
end
