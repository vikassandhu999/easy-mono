defmodule Easy.ConnCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      @endpoint EasyWeb.Endpoint

      use EasyWeb, :verified_routes

      import Plug.Conn
      import Phoenix.ConnTest
      import Easy.ConnCase
      import Easy.Factory
    end
  end

  setup tags do
    Easy.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end

  @spec authenticate_coach(Plug.Conn.t(), Easy.Orgs.Coach.t()) :: Plug.Conn.t()
  def authenticate_coach(conn, coach) do
    token =
      Joken.generate_and_sign!(
        Easy.Identity.Token.token_config(),
        %{
          user_id: coach.user_id,
          session_id: Ecto.UUID.generate(),
          role: "coach",
          business_id: coach.business_id
        },
        Easy.Identity.Token.signer()
      )

    Plug.Conn.put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
