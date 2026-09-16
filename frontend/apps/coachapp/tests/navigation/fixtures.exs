if Mix.env() != :dev, do: raise("Run navigation fixtures in MIX_ENV=dev")
Logger.configure(level: :warning)
Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, "easy_coachapp_auth_dev"))
Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
Application.put_env(:easy, :start_client_subscription_sweeper, false)
Application.put_env(:easy, :start_check_in_sweeper, false)
{:ok, _} = Application.ensure_all_started(:easy)

fixtures =
  for width <- [375, 1280] do
    suffix = "#{System.system_time(:microsecond)}-#{width}"
    owner_email = "navigation-owner-#{suffix}@example.test"
    {:ok, owner} = Easy.Identity.signup(%{"email" => owner_email, "first_name" => "Test Owner"})
    {:ok, _} = Easy.Identity.verify_otp(owner_email, "123456", %{})
    {:ok, business} = Easy.Orgs.create_business(Easy.Ctx.new(nil, owner.id), %{name: "Test Navigation", handle: "navigation-#{suffix}"})
    {:ok, coach} = Easy.Coaches.get_active_coach_by_user_id(owner.id)
    ctx = Easy.Ctx.new(business.id, owner.id, coach.id, true)
    trainer_email = "navigation-trainer-#{suffix}@example.test"
    {:ok, invitation} = Easy.CoachInvitations.invite_trainer(ctx, %{"email" => trainer_email, "first_name" => "Test Trainer"})
    %{width: width, suffix: suffix, owner_email: owner_email, trainer_email: trainer_email, invitation_token: invitation.invitation_token}
  end

path = Path.expand("../frontend/apps/coachapp/tests/navigation/artifacts/fixtures.json")
File.mkdir_p!(Path.dirname(path))
File.write!(path, Jason.encode!(fixtures))
IO.puts("Created isolated navigation fixtures")
