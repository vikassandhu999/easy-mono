defmodule Easy.Identity.OtpConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias Easy.Identity.{AuthTokens, EmailConfirmation, OneTimeToken, OneTimeTokens, OtpDelivery, User, UserSession}
  alias Easy.Identity.Signup
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    user =
      %{email: "otp-race-#{Ecto.UUID.generate()}@test.com"}
      |> User.insert_changeset()
      |> Ecto.Changeset.put_change(:email_confirmed_at, DateTime.utc_now(:second))
      |> Repo.insert!()

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      Repo.delete_all(from s in UserSession, where: s.user_id == ^user.id)
      Repo.delete_all(from t in OneTimeToken, where: t.user_id == ^user.id)
      Repo.delete_all(from u in User, where: u.id == ^user.id)
    end)

    %{user: user}
  end

  for type <- [:authentication, :email_confirmation, :signup_confirmation] do
    @issuance_type type

    test "concurrent #{@issuance_type} resends replace the previous code once", %{user: user} do
      issuer_type = @issuance_type
      type = token_type(issuer_type)
      previous_otp = Application.fetch_env(:easy, :fixed_otp)
      Application.put_env(:easy, :fixed_otp, "123456")

      on_exit(fn ->
        case previous_otp do
          {:ok, value} -> Application.put_env(:easy, :fixed_otp, value)
          :error -> Application.delete_env(:easy, :fixed_otp)
        end
      end)

      prepare_issuer(user, type)

      {:ok, old_token} = OneTimeTokens.create_token(user, type, "000000")
      parent = self()

      assert {:ok, contenders} =
               Repo.transaction(fn ->
                 OneTimeToken |> lock("FOR UPDATE") |> Repo.get!(old_token.id)

                 contenders =
                   for index <- 1..2 do
                     Task.async(fn ->
                       Sandbox.checkout(Repo, sandbox: false)
                       %{rows: [[pid]]} = Repo.query!("SELECT pg_backend_pid()")
                       send(parent, {:issuer, pid})
                       issue(issuer_type, user.email, index)
                     end)
                   end

                 for _ <- 1..2 do
                   assert_receive {:issuer, pid}, 1_000
                   assert_blocked(pid, 100)
                 end

                 contenders
               end)

      assert Enum.map(contenders, &Task.await(&1, 5_000)) == [{:ok, :sent}, {:ok, :sent}]
      assert [token] = Repo.all(from t in OneTimeToken, where: t.user_id == ^user.id)
      assert token.token_hash == OneTimeTokens.generate_token_hash(user.email <> "123456")
      refute Repo.get(OneTimeToken, old_token.id)
    end
  end

  for {type, expected_error} <- [
        email_confirmation: :email_already_confirmed,
        signup_confirmation: :email_already_exists
      ] do
    @resend_type type
    @resend_error expected_error

    test "#{@resend_type} resend observes a confirmation committed while it waits", %{user: user} do
      prepare_issuer(user, :email_confirmation)
      {:ok, token} = OneTimeTokens.create_token(user, :email_confirmation, "123456")
      parent = self()

      assert {:ok, {confirmed, contender}} =
               Repo.transaction(fn ->
                 OneTimeToken |> lock("FOR UPDATE") |> Repo.get!(token.id)

                 contender =
                   Task.async(fn ->
                     Sandbox.checkout(Repo, sandbox: false)
                     %{rows: [[pid]]} = Repo.query!("SELECT pg_backend_pid()")
                     send(parent, {:resender, pid})
                     issue(@resend_type, user.email, 1)
                   end)

                 assert_receive {:resender, pid}, 1_000
                 assert_blocked(pid, 100)
                 {consume(:email_confirmation, user.email, token.token_hash), contender}
               end)

      assert {:ok, %{access_token: _}} = confirmed
      assert {:error, @resend_error} = Task.await(contender, 5_000)
      assert Repo.aggregate(from(t in OneTimeToken, where: t.user_id == ^user.id), :count) == 0
      assert Repo.aggregate(from(s in UserSession, where: s.user_id == ^user.id), :count) == 1
    end

    test "#{@resend_type} resend invalidates an old code before waiting verification proceeds", %{user: user} do
      prepare_issuer(user, :email_confirmation)
      {:ok, token} = OneTimeTokens.create_token(user, :email_confirmation, "000000")
      parent = self()

      assert {:ok, {resent, contender}} =
               Repo.transaction(fn ->
                 User |> lock("FOR UPDATE") |> Repo.get!(user.id)

                 resender =
                   Task.async(fn ->
                     Sandbox.checkout(Repo, sandbox: false)
                     %{rows: [[pid]]} = Repo.query!("SELECT pg_backend_pid()")
                     send(parent, {:resender, pid})
                     issue(@resend_type, user.email, 1)
                   end)

                 assert_receive {:resender, pid}, 1_000
                 assert_blocked(pid, 100)

                 contender =
                   Task.async(fn ->
                     Sandbox.checkout(Repo, sandbox: false)
                     %{rows: [[pid]]} = Repo.query!("SELECT pg_backend_pid()")
                     send(parent, {:verifier, pid})
                     consume(:email_confirmation, user.email, token.token_hash)
                   end)

                 assert_receive {:verifier, pid}, 1_000
                 assert_blocked(pid, 100)
                 {resender, contender}
               end)

      assert {:ok, :sent} = Task.await(resent, 5_000)
      assert {:error, :token_invalid} = Task.await(contender, 5_000)
      assert [replacement] = Repo.all(from t in OneTimeToken, where: t.user_id == ^user.id)
      refute replacement.token_hash == token.token_hash
      assert Repo.get!(User, user.id).email_confirmed_at == nil
      assert Repo.aggregate(from(s in UserSession, where: s.user_id == ^user.id), :count) == 0
    end
  end

  for {type, expected_error} <- [authentication: :invalid_otp, email_confirmation: :token_invalid] do
    @token_type type
    @expected_error expected_error

    test "concurrent #{@token_type} consumption creates one session and rejects the loser", %{user: user} do
      type = @token_type
      {:ok, token} = OneTimeTokens.create_token(user, type, "123456")
      parent = self()

      assert {:ok, {winner, contender}} =
               Repo.transaction(fn ->
                 OneTimeToken |> lock("FOR UPDATE") |> Repo.get!(token.id)

                 contender =
                   Task.async(fn ->
                     Sandbox.checkout(Repo, sandbox: false)
                     %{rows: [[backend_pid]]} = Repo.query!("SELECT pg_backend_pid()")
                     send(parent, {:contender, backend_pid})

                     try do
                       consume(type, user.email, token.token_hash)
                     rescue
                       error -> {:raised, error.__struct__}
                     end
                   end)

                 assert_receive {:contender, backend_pid}, 1_000
                 assert_blocked(backend_pid, 100)
                 {consume(type, user.email, token.token_hash), contender}
               end)

      assert {:ok, %{access_token: _}} = winner
      assert {:error, @expected_error} = Task.await(contender, 5_000)
      assert Repo.aggregate(from(s in UserSession, where: s.user_id == ^user.id), :count) == 1
      refute Repo.get(OneTimeToken, token.id)
    end
  end

  defp consume(:authentication, email, _hash), do: AuthTokens.token(:otp, %{email: email, otp: "123456"})
  defp consume(:email_confirmation, _email, hash), do: EmailConfirmation.verify(hash, %{ip: nil, user_agent: nil})

  defp token_type(:signup_confirmation), do: :email_confirmation
  defp token_type(type), do: type

  defp issue(:signup_confirmation, email, 1) do
    with {:ok, _user} <- Signup.signup(%{"email" => email}), do: {:ok, :sent}
  end

  defp issue(type, email, _index), do: OtpDelivery.send_otp(email, Atom.to_string(token_type(type)))

  defp prepare_issuer(user, :email_confirmation) do
    user |> Ecto.Changeset.change(email_confirmed_at: nil) |> Repo.update!()
  end

  defp prepare_issuer(user, :authentication), do: user

  defp assert_blocked(_backend_pid, 0), do: flunk("contender never waited for the token transaction")

  defp assert_blocked(backend_pid, attempts) do
    case Repo.query!("SELECT cardinality(pg_blocking_pids($1)) > 0", [backend_pid]).rows do
      [[true]] ->
        :ok

      [[false]] ->
        Process.sleep(10)
        assert_blocked(backend_pid, attempts - 1)
    end
  end
end
