defmodule Easy.Identity.AuthTokensTest do
  use Easy.DataCase, async: false

  import ExUnit.CaptureLog

  alias Easy.Identity.{AuthTokens, EmailConfirmation, OneTimeToken, OneTimeTokens, UserSession}

  test "rejected refreshes preserve session credentials, metadata and scope" do
    now = DateTime.utc_now(:second)

    cases = [
      {[expires_at: DateTime.add(now, -60, :second)], :guest, :session_expired},
      {[revoked_at: now], :guest, :session_revoked},
      {[], :coach, :coach_membership_not_found},
      {[], :client, :client_membership_not_found}
    ]

    for {attrs, role, error} <- cases do
      session = insert(:user_session, Keyword.merge([role: :guest, ip: "127.0.0.1", user_agent: "Original"], attrs))
      before = Repo.get!(UserSession, session.id)

      assert {:error, ^error} =
               AuthTokens.token(:refresh_token, %{
                 refresh_token: session.refresh_token,
                 role: role,
                 ip: "192.0.2.1",
                 user_agent: "Changed"
               })

      assert Repo.get!(UserSession, session.id) == before
    end
  end

  test "missing membership rolls back OTP consumption and permits a valid retry" do
    user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))
    assert {:ok, token} = OneTimeTokens.create_token(user, :authentication, "123456")
    opts = %{email: user.email, otp: "123456", role: :guest}

    for {role, error} <- [coach: :coach_membership_not_found, client: :client_membership_not_found] do
      assert {:error, ^error} = AuthTokens.token(:otp, %{opts | role: role})
      assert Repo.get!(OneTimeToken, token.id).token_hash == token.token_hash
      refute Repo.get_by(UserSession, user_id: user.id)
    end

    assert {:ok, %{scope: "guest"}} = AuthTokens.token(:otp, opts)
    assert Repo.get_by!(UserSession, user_id: user.id).role == :guest
    refute Repo.get(OneTimeToken, token.id)
    assert {:error, :invalid_otp} = AuthTokens.token(:otp, opts)
  end

  test "refresh credentials never enter application logs" do
    previous_level = Logger.level()
    Logger.configure(level: :info)
    secret = "refresh-credential-that-must-not-be-logged"

    try do
      log =
        capture_log(fn ->
          assert {:error, :session_not_found} = AuthTokens.token(:refresh_token, %{refresh_token: secret})
        end)

      refute log =~ secret
    after
      Logger.configure(level: previous_level)
    end
  end

  test "a fresh confirmation code has its own lifetime after the original signup expires" do
    user =
      insert(:user,
        email_confirmed_at: nil,
        confirmation_sent_at: DateTime.add(DateTime.utc_now(:second), -3600, :second)
      )

    assert {:ok, token} = OneTimeTokens.create_token(user, :email_confirmation, "123456")
    assert {:ok, %{scope: "guest"}} = EmailConfirmation.verify(token.token_hash, %{ip: nil, user_agent: nil})
  end

  test "a fresh user confirmation timestamp cannot extend an expired code" do
    user = insert(:user, email_confirmed_at: nil, confirmation_sent_at: DateTime.utc_now(:second))
    assert {:ok, token} = OneTimeTokens.create_token(user, :email_confirmation, "123456")

    token
    |> Ecto.Changeset.change(inserted_at: DateTime.add(DateTime.utc_now(:second), -600, :second))
    |> Repo.update!()

    assert {:error, :token_expired} = EmailConfirmation.verify(token.token_hash, %{ip: nil, user_agent: nil})
  end

  test "confirmation defaults missing session metadata and fixes the guest role" do
    user = insert(:user, email_confirmed_at: nil)
    assert {:ok, token} = OneTimeTokens.create_token(user, :email_confirmation, "123456")

    assert {:ok, %{scope: "guest"}} = EmailConfirmation.verify(token.token_hash, %{role: :coach})

    session = Repo.get_by!(UserSession, user_id: user.id)
    assert session.role == :guest
    assert session.ip == nil
    assert session.user_agent == nil
  end
end
