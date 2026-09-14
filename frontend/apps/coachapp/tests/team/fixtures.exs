if Mix.env() != :dev, do: raise("Run team fixtures in MIX_ENV=dev")
Logger.configure(level: :warning)
Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, "easy_coachapp_auth_dev"))
Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
Application.put_env(:easy, :start_client_subscription_sweeper, false)
Application.put_env(:easy, :start_check_in_sweeper, false)
{:ok, _} = Application.ensure_all_started(:easy)

fixtures = for width <- [375, 1280] do
  suffix = "#{System.system_time(:microsecond)}-#{width}"
  email = "team-owner-#{suffix}@example.test"
  {:ok, owner} = Easy.Identity.signup(%{"email" => email, "first_name" => "Taylor", "last_name" => "Reed"})
  {:ok, _} = Easy.Identity.verify_otp(email, "123456", %{})
  {:ok, business} = Easy.Orgs.create_business(Easy.Ctx.new(nil, owner.id), %{name: "Team Coaching #{width}", handle: "team-#{suffix}"})
  {:ok, coach} = Easy.Coaches.get_active_coach_by_user_id(owner.id)
  ctx = Easy.Ctx.new(business.id, owner.id, coach.id, true)
  members = for name <- ["Jamie", "Casey", "Drew", "Historic", "Avery", "Riley", "Jordan", "Quinn", "Blair", "Kai", "Sam"] do
    {:ok, invitation} = Easy.CoachInvitations.invite_trainer(ctx, %{"email" => "#{String.downcase(name)}-#{suffix}@example.test", "first_name" => name, "last_name" => "Morgan"})
    if name == "Historic" do
      invitation |> Ecto.Changeset.change(inserted_at: DateTime.add(DateTime.utc_now(:second), -60, :day), invitation_sent_at: DateTime.add(DateTime.utc_now(:second), -40, :day)) |> Easy.Repo.update!()
    end
    %{id: invitation.id, name: name, email: invitation.email, invitation_token: invitation.invitation_token}
  end
  clients = for name <- ["Alex", "Robin"] do
    {:ok, client} = Easy.ClientInvitations.create(ctx, %{"first_name" => name, "last_name" => "Lane", "email" => "client-#{String.downcase(name)}-#{suffix}@example.test"})
    %{id: client.id, name: name, email: client.email, invitation_token: client.invitation_token}
  end
  %{width: width, suffix: suffix, owner_email: email, owner_id: coach.id, members: members, clients: clients}
end
path = Path.expand("../frontend/apps/coachapp/tests/team/artifacts/fixtures.json")
File.mkdir_p!(Path.dirname(path))
File.write!(path, Jason.encode!(fixtures))
IO.puts("Created isolated team fixtures")
