defmodule EasyWeb.AuthController do
  alias Easy.Organizations
  alias Easy.Repo
  use EasyWeb, :controller

  alias EasyWeb.Registration
  alias Easy.{Accounts, Clients, Nutrition}
  alias Easy.Accounts.Session
  alias Easy.Training.Programming
  alias Easy.Auth.Scope

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

  def check_email(conn, %{"email" => email}) do
    available = Accounts.email_available_for_registration?(email)

    conn
    |> put_status(:ok)
    |> json(%{available: available})
    |> halt()
  end

  def check_email(_conn, _params) do
    {:error, Error.unprocessable("email is required")}
  end

  def check_handle(conn, %{"handle" => handle}) do
    available = Organizations.handle_available?(handle)

    conn
    |> put_status(:ok)
    |> json(%{available: available})
    |> halt()
  end

  def check_handle(_conn, _params) do
    {:error, Error.unprocessable("handle is required")}
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
            # Get stats for the coach's business
            total_clients = Clients.count_clients_for_business(coach.business_id)
            total_nutrition_plans = Nutrition.count_nutrition_plans(coach.business_id)
            total_training_plans = Programming.count_training_plans(coach.business_id)

            Map.merge(response, %{
              coach: %{
                id: coach.id,
                business_id: coach.business_id,
                bio: coach.bio,
                specialties: coach.specialties || [],
                instagram_url: coach.instagram_url,
                facebook_url: coach.facebook_url,
                youtube_url: coach.youtube_url,
                x_url: coach.x_url,
                years_of_experience: coach.years_of_experience,
                certifications: coach.certifications || [],
                stats: %{
                  total_clients: total_clients,
                  total_plans: total_nutrition_plans + total_training_plans
                }
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

  def logout(conn, _params) do
    with claims <- conn.assigns.token_claims,
         session_id <- claims["session_id"],
         %Session{} = session <- Repo.get(Session, session_id),
         {:ok, _revoked_session} <- session |> Session.revoke_changeset() |> Repo.update() do
      conn
      |> put_status(:ok)
      |> json(%{status: "ok", message: "Logged out successfully"})
      |> halt()
    else
      nil ->
        # Session not found, but still return success (already logged out)
        conn
        |> put_status(:ok)
        |> json(%{status: "ok", message: "Logged out successfully"})
        |> halt()

      {:error, _reason} ->
        conn
        |> put_status(:ok)
        |> json(%{status: "ok", message: "Logged out successfully"})
        |> halt()
    end
  end

  @doc """
  PATCH /api/auth/profile

  Updates the authenticated coach's profile (user info and coach info).
  """
  def update_coach_profile(conn, params) do
    scope = conn.assigns.scope

    Scope.require_role!(scope, "coach")

    user_attrs = Map.take(params, ["first_name", "last_name"])

    coach_attrs =
      Map.take(params, [
        "bio",
        "specialties",
        "instagram_url",
        "facebook_url",
        "youtube_url",
        "x_url",
        "years_of_experience",
        "certifications"
      ])

    with %Accounts.User{} = user <- Repo.get(Accounts.User, scope.user_id),
         {:ok, updated_user} <- Accounts.update_user(user, user_attrs),
         %Organizations.Coach{} = coach <- Accounts.get_coach_by_user(updated_user),
         {:ok, _updated_coach} <- Organizations.update_coach(coach, coach_attrs) do
      conn
      |> put_status(:ok)
      |> json(%{
        status: "ok",
        message: "Profile updated successfully",
        user: %{
          id: updated_user.id,
          email: updated_user.email,
          first_name: updated_user.first_name,
          last_name: updated_user.last_name
        }
      })
      |> halt()
    end
  end
end
