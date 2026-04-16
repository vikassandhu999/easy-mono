defmodule EasyWeb.AuthController do
  alias Easy.Clients.Client
  alias Easy.Identity
  alias Easy.Repo
  alias Easy.Utils
  use EasyWeb, :controller

  @allowed_roles ["owner", "coach", "client", "guest"]

  def signup(conn, params) do
    with {:ok, user} <- Easy.Identity.signup(params) do
      conn
      |> put_status(201)
      |> json(%{
        id: user.id,
        email: user.email,
        confirmation_sent_at: user.confirmation_sent_at,
        inserted_at: user.inserted_at,
        updated_at: user.updated_at
      })
    end
  end

  def accept_invite(conn, %{"invitation_token" => _, "email" => _} = params) do
    with {:ok, :otp_sent} <- Identity.accept_invite(params) do
      conn
      |> put_status(200)
      |> json(%{message: "OTP sent to the provided email."})
    end
  end

  @spec accept_invite_verify(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def accept_invite_verify(
        conn,
        %{"invitation_token" => _, "email" => _, "otp" => _} = params
      ) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    with {:ok, auth_token} <-
           Identity.verify_accept_invite(params, %{ip: ip, user_agent: user_agent}) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end

  @spec show_invitation(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show_invitation(conn, %{"token" => token}) do
    body =
      case Client.resolve_invitation_token(token) do
        {:ok, client} ->
          client = Repo.preload(client, [:business, :creator])

          %{
            state: "pending",
            business_name: client.business.name,
            coach_first_name: coach_display_name(client.creator),
            prefill_email: client.email,
            expires_at: Client.invitation_expires_at(client)
          }

        {:error, state} ->
          %{state: Atom.to_string(state)}
      end

    conn |> put_status(200) |> json(%{data: body})
  end

  defp coach_display_name(nil), do: "Coach"
  defp coach_display_name(%{first_name: nil}), do: "Coach"
  defp coach_display_name(%{first_name: ""}), do: "Coach"
  defp coach_display_name(%{first_name: name}), do: name

  def verify(conn, %{"token" => token_hash}) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    with {:ok, token} <-
           Easy.Identity.verify(token_hash, %{ip: ip, user_agent: user_agent, role: :guest}) do
      conn
      |> put_status(200)
      |> json(token)
    else
      {:error, :token_invalid} ->
        {:error,
         Easy.Error.new(
           "token_invalid",
           "The provided token is invalid, please check and try again"
         )}

      {:error, :token_expired} ->
        {:error,
         Easy.Error.new(
           "token_expired",
           "The provided token has expired, please request a new one"
         )}
    end
  end

  def verify(conn, %{"email" => email, "otp" => otp}) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    token_hash = Easy.Identity.OneTimeTokens.generate_token_hash(email <> otp)

    with {:ok, token} <-
           Easy.Identity.verify(token_hash, %{ip: ip, user_agent: user_agent, role: :guest}) do
      conn
      |> put_status(200)
      |> json(token)
    else
      {:error, :token_invalid} ->
        {:error, Easy.Error.new("otp_invalid", "Invalid OTP, please check and try again")}

      {:error, :token_expired} ->
        {:error, Easy.Error.new("otp_expired", "OTP has expired, please request a new one")}
    end
  end

  def otp(conn, %{"email" => email, "type" => type}) do
    with {:ok, _} <- Easy.Identity.send_otp(email, type) do
      conn
      |> put_status(200)
      |> json(%{message: "OTP sent successfully"})
    end
  end

  def token(
        conn,
        %{
          "grant_type" => "refresh_token",
          "refresh_token" => refresh_token
        } = params
      ) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    opts = %{
      refresh_token: refresh_token,
      ip: ip,
      user_agent: user_agent,
      role: Utils.safe_to_atom(params["role"], @allowed_roles)
    }

    with {:ok, auth_token} <- Identity.token(:refresh_token, opts) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end

  def token(conn, %{"grant_type" => "otp", "email" => email, "otp" => otp, "role" => role}) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    token_hash = Identity.OneTimeTokens.generate_token_hash(email <> otp)

    opts = %{
      token_hash: token_hash,
      ip: ip,
      user_agent: user_agent,
      role: Utils.safe_to_atom(role, @allowed_roles)
    }

    with {:ok, auth_token} <- Identity.token(:otp, opts) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end
end
