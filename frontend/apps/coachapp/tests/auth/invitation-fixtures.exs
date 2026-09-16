if Mix.env() != :dev, do: raise("Run auth fixtures in MIX_ENV=dev")

Logger.configure(level: :warning)

if database = System.get_env("AUTH_TEST_DATABASE") do
  Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, database))
end

Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
Application.put_env(:easy, :start_client_subscription_sweeper, false)
Application.put_env(:easy, :start_check_in_sweeper, false)
{:ok, _} = Application.ensure_all_started(:easy)

suffix = System.system_time(:microsecond)
email = "invite-owner-#{suffix}@example.test"
{:ok, owner} = Easy.Identity.signup(%{"email" => email, "first_name" => "Invite owner"})
{:ok, _} = Easy.Identity.verify_otp(email, "123456", %{})
{:ok, business} = Easy.Orgs.create_business(Easy.Ctx.new(nil, owner.id), %{name: "Invitation Coaching", handle: "invite-#{suffix}"})
{:ok, coach} = Easy.Coaches.get_active_coach_by_user_id(owner.id)
ctx = Easy.Ctx.new(business.id, owner.id, coach.id, true)

{:ok, invitation} = Easy.CoachInvitations.invite_trainer(ctx, %{"email" => "trainer-#{suffix}@example.test"})
{:ok, unavailable} = Easy.CoachInvitations.invite_trainer(ctx, %{"email" => "unavailable-#{suffix}@example.test"})
token = unavailable.invitation_token
{:ok, _} = Easy.CoachInvitations.revoke_invite(ctx, unavailable.id)
{:ok, expired} = Easy.CoachInvitations.invite_trainer(ctx, %{"email" => "expired-#{suffix}@example.test"})
expired |> Ecto.Changeset.change(invitation_sent_at: DateTime.add(DateTime.utc_now(:second), -365, :day)) |> Easy.Repo.update!()

verification_email = "verification-#{suffix}@example.test"
{:ok, verification_user} = Easy.Identity.signup(%{"email" => verification_email, "first_name" => "Test verification"})
verification_token = Easy.Repo.one!(Easy.Identity.OneTimeToken.issued_to_user(verification_user.id, :email_confirmation))
verification_token |> Ecto.Changeset.change(inserted_at: DateTime.add(DateTime.utc_now(:second), -1, :day)) |> Easy.Repo.update!()
{:ok, another_invitation} = Easy.CoachInvitations.invite_trainer(ctx, %{"email" => "another-trainer-#{suffix}@example.test"})

path = Path.expand("../frontend/apps/coachapp/tests/auth/artifacts/invitations.json")
File.mkdir_p!(Path.dirname(path))

File.write!(
  path,
  Jason.encode!(%{
    token: invitation.invitation_token,
    email: invitation.email,
    unavailable_token: token,
    expired_token: expired.invitation_token,
    another_token: another_invitation.invitation_token,
    verification_token: verification_token.token_hash,
    verification_email: verification_email
  })
)

IO.puts("Created invitation fixtures")
