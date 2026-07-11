defmodule Easy.ConnCase do
  use ExUnit.CaseTemplate

  alias Easy.Clients.Client
  alias Easy.DataCase
  alias Easy.Identity.Token
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Ecto.Adapters.SQL
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
    is_owner = business.owner_id == coach.user_id

    token =
      Joken.generate_and_sign!(
        Token.token_config(),
        %{
          user_id: coach.user_id,
          session_id: Ecto.UUID.generate(),
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
    token =
      Joken.generate_and_sign!(
        Token.token_config(),
        %{
          user_id: client.user_id,
          session_id: Ecto.UUID.generate(),
          role: "client",
          business_id: client.business_id
        },
        Token.signer()
      )

    Conn.put_req_header(conn, "authorization", "Bearer #{token}")
  end

  @spec training_tables_ready?() :: boolean()
  def training_tables_ready? do
    required_tables = [
      "training_plans",
      "workouts",
      "workout_elements",
      "exercises",
      "workout_sessions"
    ]

    case SQL.query(
           Repo,
           "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
           []
         ) do
      {:ok, %{rows: rows}} ->
        existing = rows |> List.flatten() |> MapSet.new()
        Enum.all?(required_tables, &MapSet.member?(existing, &1))

      _ ->
        false
    end
  end
end
