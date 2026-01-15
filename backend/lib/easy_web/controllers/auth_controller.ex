defmodule EasyWeb.AuthController do
  use EasyWeb, :controller

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

  def verify(conn, %{"token" => token_hash}) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    with {:ok, token} <- Easy.Identity.verify(token_hash, %{ip: ip, user_agent: user_agent}) do
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

    with {:ok, token} <- Easy.Identity.verify(token_hash, %{ip: ip, user_agent: user_agent}) do
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

  def token(conn, %{"grant_type" => "refresh_token", "refresh_token" => refresh_token}) do
    with {:ok, auth_token} <- Easy.Identity.token(:refresh_token, refresh_token) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end

  def token(conn, %{"grant_type" => "otp", "email" => email, "otp" => otp}) do
    ip = conn.remote_ip |> Tuple.to_list() |> Enum.join(".")
    user_agent = get_req_header(conn, "user-agent") |> List.first() || "unknown"

    token_hash = Easy.Identity.OneTimeTokens.generate_token_hash(email <> otp)

    with {:ok, auth_token} <-
           Easy.Identity.token(:otp, token_hash, %{ip: ip, user_agent: user_agent}) do
      conn
      |> put_status(200)
      |> json(auth_token)
    end
  end
end
