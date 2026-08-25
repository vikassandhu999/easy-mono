defmodule EasyWeb.Plugs.Idempotency do
  import Plug.Conn

  alias Easy.Error

  @spec init(term()) :: term()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), term()) :: Plug.Conn.t()
  def call(conn, _opts) do
    case get_req_header(conn, "idempotency-key") do
      [key] ->
        case Ecto.UUID.cast(key) do
          {:ok, uuid} -> assign(conn, :idempotency_key, uuid)
          :error -> reject(conn)
        end

      _ ->
        reject(conn)
    end
  end

  defp reject(conn) do
    error = Error.unprocessable(%{fields: %{"Idempotency-Key" => ["must be a UUID"]}})

    body = %{
      error_code: to_string(error.code),
      error_message: error.message,
      error_detail: error.detail
    }

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(422, Jason.encode!(body))
    |> halt()
  end
end
