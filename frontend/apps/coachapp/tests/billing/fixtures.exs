if Mix.env() != :dev, do: raise("Run billing fixtures in MIX_ENV=dev")
Logger.configure(level: :warning)
Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, System.get_env("EASY_BROWSER_DATABASE", "easy_browser_dev")))
Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
{:ok, _} = Application.ensure_all_started(:easy)

fixtures = for width <- [375, 1280] do
  suffix = "#{System.system_time(:microsecond)}-#{width}"
  email = "billing-owner-#{suffix}@example.test"
  {:ok, owner} = Easy.Identity.signup(%{"email" => email, "full_name" => "Taylor Reed"})
  {:ok, _} = Easy.Identity.verify_otp(email, "123456", %{})
  {:ok, business} = Easy.Orgs.create_business(Easy.Ctx.new(nil, owner.id), %{name: "Billing Coaching #{width}", handle: "billing-#{suffix}"})
  {:ok, coach} = Easy.Coaches.get_active_coach_by_user_id(owner.id)
  ctx = Easy.Ctx.new(business.id, owner.id, coach.id, true)
  {:ok, _} = Easy.Billing.grant_free_seats(ctx, 2)
  trainer_email = "billing-trainer-#{suffix}@example.test"
  {:ok, invitation} = Easy.CoachInvitations.invite_trainer(ctx, %{"email" => trainer_email, "full_name" => "Jamie"})
  for name <- ["Alex", "Robin"] do
    client_email = "#{String.downcase(name)}-#{suffix}@example.test"
    {:ok, person} = Easy.ClientInvitations.create(ctx, %{email: client_email, full_name: "#{name} Lane"})
    {:ok, user} = Easy.Identity.signup(%{"email" => client_email, "full_name" => "#{name} Lane"})
    {:ok, _} = Easy.ClientInvitations.accept_invite(person, user.id, client_email)
  end
  %{width: width, owner_email: email, trainer_email: trainer_email, invitation_token: invitation.invite_token}
end
path = Path.expand("../frontend/apps/coachapp/tests/billing/artifacts/fixtures.json")
File.mkdir_p!(Path.dirname(path))
File.write!(path, Jason.encode!(fixtures))
IO.puts("Created isolated billing fixtures")
