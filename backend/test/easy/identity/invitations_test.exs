defmodule Easy.Identity.InvitationsTest do
  use Easy.DataCase, async: false

  alias Easy.Identity.Invitations
  alias Easy.Identity.OneTimeToken
  alias Easy.Orgs.Coach
  alias Easy.Repo

  @session_opts %{ip: "127.0.0.1", user_agent: "test-agent"}

  setup do
    Application.put_env(:easy, :fixed_otp, "123456")
    on_exit(fn -> Application.delete_env(:easy, :fixed_otp) end)
    :ok
  end

  defp invited_coach(business) do
    insert(:coach,
      business: business,
      user: nil,
      status: :invited,
      email: "trainer-#{System.unique_integer([:positive])}@test.com",
      first_name: "Tara",
      last_name: "Trainer",
      invitation_token: "tok-#{System.unique_integer([:positive])}",
      invitation_sent_at: DateTime.utc_now(:second)
    )
  end

  describe "accept_trainer_invite/1" do
    test "sends an OTP for a valid invitation token" do
      business = insert(:business)
      coach = invited_coach(business)

      assert {:ok, :otp_sent} =
               Invitations.accept_trainer_invite(%{
                 "invitation_token" => coach.invitation_token,
                 "email" => coach.email
               })

      assert Repo.get_by(OneTimeToken, token_type: :invitation_acceptance, relates_to: coach.email)
    end

    test "returns an error for an invalid invitation token" do
      assert {:error, :invitation_invalid} =
               Invitations.accept_trainer_invite(%{
                 "invitation_token" => "does-not-exist",
                 "email" => "nope@test.com"
               })
    end
  end

  describe "verify_accept_trainer_invite/2" do
    test "verifies the OTP, links the user, and returns auth tokens with coach claims" do
      business = insert(:business)
      coach = invited_coach(business)

      assert {:ok, :otp_sent} =
               Invitations.accept_trainer_invite(%{
                 "invitation_token" => coach.invitation_token,
                 "email" => coach.email
               })

      assert {:ok, tokens} =
               Invitations.verify_accept_trainer_invite(
                 %{
                   "invitation_token" => coach.invitation_token,
                   "email" => coach.email,
                   "otp" => "123456"
                 },
                 @session_opts
               )

      assert tokens.scope == "coach"
      assert tokens.access_token
      assert tokens.refresh_token

      updated = Repo.get!(Coach, coach.id)
      assert updated.status == :active
      assert updated.user_id
      assert updated.invitation_token == nil
    end

    test "rejects a wrong OTP" do
      business = insert(:business)
      coach = invited_coach(business)

      assert {:ok, :otp_sent} =
               Invitations.accept_trainer_invite(%{
                 "invitation_token" => coach.invitation_token,
                 "email" => coach.email
               })

      assert {:error, :invalid_otp} =
               Invitations.verify_accept_trainer_invite(
                 %{
                   "invitation_token" => coach.invitation_token,
                   "email" => coach.email,
                   "otp" => "000000"
                 },
                 @session_opts
               )
    end

    test "rejects an expired OTP" do
      business = insert(:business)
      coach = invited_coach(business)

      assert {:ok, :otp_sent} =
               Invitations.accept_trainer_invite(%{
                 "invitation_token" => coach.invitation_token,
                 "email" => coach.email
               })

      from(t in OneTimeToken, where: t.token_type == ^:invitation_acceptance)
      |> Repo.update_all(set: [inserted_at: NaiveDateTime.add(NaiveDateTime.utc_now(), -700, :second)])

      assert {:error, :otp_expired} =
               Invitations.verify_accept_trainer_invite(
                 %{
                   "invitation_token" => coach.invitation_token,
                   "email" => coach.email,
                   "otp" => "123456"
                 },
                 @session_opts
               )
    end
  end
end
