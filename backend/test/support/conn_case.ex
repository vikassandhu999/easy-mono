defmodule Easy.ConnCase do
  use ExUnit.CaseTemplate

  alias Easy.Clients.Client
  alias Easy.DataCase
  alias Easy.Identity.Token
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Phoenix.ConnTest
  alias Plug.Conn

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
    DataCase.setup_sandbox(tags)

    conn =
      ConnTest.build_conn()
      |> Conn.put_req_header("content-type", "application/json")

    {:ok, conn: conn}
  end

  @spec authenticate_coach(Conn.t(), Coach.t()) :: Conn.t()
  def authenticate_coach(conn, coach) do
    business = Repo.get!(Business, coach.business_id)
    is_owner = business.owner_user_id == coach.user_id

    session =
      Easy.Factory.insert(:user_session,
        user_id: coach.user_id,
        user: nil,
        business_id: coach.business_id,
        coach_id: coach.id,
        role: :coach,
        is_owner: business.owner_user_id == coach.user_id
      )

    token =
      Joken.generate_and_sign!(
        Token.token_config(),
        %{
          user_id: coach.user_id,
          session_id: session.id,
          role: "coach",
          business_id: coach.business_id,
          coach_id: coach.id,
          is_owner: is_owner
        },
        Token.signer()
      )

    Conn.put_req_header(conn, "authorization", "Bearer #{token}")
  end

  @spec authenticate_client(Conn.t(), Client.t()) :: Conn.t()
  def authenticate_client(conn, client) do
    session =
      Easy.Factory.insert(:user_session,
        user_id: client.user_id,
        user: nil,
        business_id: client.business_id,
        role: :client
      )

    token =
      Joken.generate_and_sign!(
        Token.token_config(),
        %{
          user_id: client.user_id,
          session_id: session.id,
          role: "client",
          business_id: client.business_id
        },
        Token.signer()
      )

    Conn.put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
