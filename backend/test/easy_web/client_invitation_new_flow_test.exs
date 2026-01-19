defmodule EasyWeb.ClientInvitationFlowNewTest do
  use Easy.ConnCase, async: true

  alias Easy.{Accounts, Repo, Organizations}
  alias Easy.Orgs.Plan

  describe "new client invitation flow" do
    setup do
      {:ok, _plan} =
        %Plan{}
        |> Plan.changeset(%{
          name: "Free Trial",
          slug: "free-trial-#{System.unique_integer([:positive])}",
          price_cents: 0,
          billing_interval: "month",
          is_default: true
        })
        |> Repo.insert()

      coach_email = "coach#{System.unique_integer([:positive])}@example.com"

      {:ok, coach_user} =
        Accounts.create_user(%{
          email: coach_email,
          full_name: "Test Coach",
          email_verified: true,
          email_verified_at: DateTime.utc_now() |> DateTime.truncate(:second)
        })

      {:ok, business} =
        Organizations.create_business_with_owner(coach_user, %{
          name: "Test Business #{System.unique_integer([:positive])}",
          handle: "test-biz-#{System.unique_integer([:positive])}"
        })

      coach = Accounts.get_coach_by_user(coach_user)
      {:ok, session_data} = Accounts.create_session(coach_user)

      %{
        coach: coach,
        coach_user: coach_user,
        business: business,
        access_token: session_data.access_token
      }
    end

    test "step 1: coach creates client invitation", %{
      conn: conn,
      access_token: access_token,
      business: business
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"
      client_name = "Test Client"

      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: client_name,
          phone: "+1234567890",
          notes: "New client from referral"
        })

      assert %{
               "client" => client_data,
               "invitation" => invitation_data
             } = json_response(conn1, 201)

      assert %{
               "id" => client_id,
               "email" => ^client_email,
               "full_name" => ^client_name,
               "phone" => "+1234567890",
               "status" => "pending",
               "business_id" => business_id
             } = client_data

      assert is_binary(client_id)
      assert business_id == business.id

      assert %{
               "token" => invitation_token,
               "invitation_url" => invitation_url,
               "expires_at" => _expires_at
             } = invitation_data

      assert is_binary(invitation_token)
      assert String.contains?(invitation_url, invitation_token)
    end

    test "step 2: client views invitation details", %{
      conn: conn,
      access_token: access_token,
      business: business,
      coach_user: coach_user
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"

      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"invitation" => %{"token" => invitation_token}} = json_response(conn1, 201)

      conn2 = get(conn, "/api/invitations/#{invitation_token}")

      assert %{
               "invitation" => invitation_info,
               "client" => client_info,
               "business" => business_info,
               "inviting_coach" => coach_info
             } = json_response(conn2, 200)

      assert %{
               "token" => ^invitation_token,
               "status" => "valid"
             } = invitation_info

      assert %{
               "email" => ^client_email,
               "full_name" => "Test Client"
             } = client_info

      assert %{
               "id" => _,
               "name" => business_name
             } = business_info

      assert business_name == business.name

      assert %{
               "full_name" => coach_full_name
             } = coach_info

      assert coach_full_name == Easy.Accounts.User.full_name(coach_user)
    end

    test "step 3: client signs up with invitation token", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "newclient#{System.unique_integer([:positive])}@example.com"

      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "New Client"
        })

      %{"invitation" => %{"token" => invitation_token}} = json_response(conn1, 201)

      {:ok, user} =
        Accounts.create_user(%{
          email: client_email,
          first_name: "New",
          last_name: "Client"
        })

      code = "123456"
      expires_at = DateTime.utc_now() |> DateTime.add(600, :second) |> DateTime.truncate(:second)

      {:ok, token} =
        %Easy.Accounts.OneTimeToken{}
        |> Easy.Accounts.OneTimeToken.changeset(%{
          code: code,
          type: "email_verification",
          expires_at: expires_at,
          user_id: user.id
        })
        |> Repo.insert()

      conn2 =
        post(conn, "/api/auth/client-signup", %{
          token_id: token.id,
          code: code,
          invitation_token: invitation_token
        })

      assert %{
               "user" => user_data,
               "session" => session_data
             } = json_response(conn2, 200)

      assert %{
               "id" => _user_id,
               "email" => ^client_email,
               "roles" => ["client"],
               "client_profile" => client_profile
             } = user_data

      assert %{
               "status" => "active",
               "assigned_coaches" => coaches
             } = client_profile

      assert length(coaches) > 0

      assert %{
               "access_token" => access_token,
               "refresh_token" => _refresh_token
             } = session_data

      assert is_binary(access_token)
    end

    test "invitation is idempotent", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"

      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"client" => %{"id" => client_id}} = json_response(conn1, 201)

      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Different Name"
        })

      assert %{"client" => %{"id" => ^client_id}} = json_response(conn2, 201)
    end

    test "returns error for invalid invitation token", %{conn: conn} do
      conn1 = get(conn, "/api/invitations/invalid_token_here")

      response = json_response(conn1, 404)
      assert %{"error_code" => "not_found"} = response
    end

    test "returns error for expired invitation", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"

      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"client" => %{"id" => client_id}, "invitation" => %{"token" => _invitation_token}} =
        json_response(conn1, 201)

      client = Repo.get(Easy.Clients.Client, client_id)
      expired_at = DateTime.utc_now() |> DateTime.add(-1, :day) |> DateTime.truncate(:second)

      client
      |> Ecto.Changeset.change(%{invitation_expires_at: expired_at})
      |> Repo.update!()

      conn2 = get(conn, "/api/invitations/#{client.invitation_token}")

      assert %{"error_code" => code} = json_response(conn2, 410)
      assert String.downcase(code) == "invitation_expired"
    end
  end
end
