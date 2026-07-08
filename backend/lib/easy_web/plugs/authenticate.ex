defmodule EasyWeb.Plugs.Authenticate do
  import Plug.Conn
  require Logger
  alias Easy.Identity.Token
  alias Easy.Utils
  alias EasyWeb.FallbackController
  alias Easy.Ctx

  @allowed_roles ["owner", "coach", "client", "guest"]

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, %{} = claims} <- Token.verify_access_token(token),
         role when not is_nil(role) <- Utils.safe_to_atom(claims["role"], @allowed_roles) do
      conn
      |> assign(:claims, %{
        user_id: claims["user_id"],
        role: role,
        business_id: claims["business_id"],
        session_id: claims["session_id"]
      })
      |> assign(
        :ctx,
        Ctx.new(claims["business_id"], claims["user_id"], claims["coach_id"], claims["is_owner"] == true)
      )
    else
      {:error, reason} ->
        Logger.warning("Authentication failed: #{inspect(reason)}")
        FallbackController.send_unauthenticated_response(conn)

      _ ->
        FallbackController.send_unauthenticated_response(conn)
    end
  end
end
