if Mix.env() != :dev, do: raise("Run intake assignment fixtures in MIX_ENV=dev")
Logger.configure(level: :warning)
Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, "easy_coachapp_auth_dev"))
Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
Application.put_env(:easy, :start_client_subscription_sweeper, false)
Application.put_env(:easy, :start_check_in_sweeper, false)
{:ok, _} = Application.ensure_all_started(:easy)

fixtures =
  for width <- [375, 1280] do
    suffix = "#{System.system_time(:microsecond)}-#{width}"
    email = "intake-assignment-owner-#{suffix}@example.test"
    {:ok, owner} = Easy.Identity.signup(%{"email" => email, "first_name" => "Test Intake"})
    {:ok, _} = Easy.Identity.verify_otp(email, "123456", %{})
    {:ok, business} = Easy.Orgs.create_business(Easy.Ctx.new(nil, owner.id), %{name: "Test Intake Assignment", handle: "intake-assignment-#{suffix}"})
    {:ok, coach} = Easy.Coaches.get_active_coach_by_user_id(owner.id)
    # Intentionally model pre-existing clients without an intake. Normal invitation creation always assigns one.
    clients = for kind <- ~w(normal lost conflict failed late inactive existing), into: %{} do
      client = business.id
      |> Easy.Clients.Client.invite_changeset(coach.id, DateTime.utc_now(:second), %{first_name: "Test #{kind}", email: "intake-assignment-#{kind}-#{suffix}@example.test"})
      |> Easy.LocalCalendar.stamp_timezone(business.timezone)
      |> Ecto.Changeset.put_change(:status, if(kind == "inactive", do: :inactive, else: :pending))
      |> Easy.Repo.insert!()
      {kind, %{id: client.id, email: client.email, invitation_token: client.invitation_token}}
    end
    %{width: width, suffix: suffix, owner_email: email, clients: clients}
  end
path = Path.expand("../frontend/apps/coachapp/tests/intake-assignment/artifacts/fixtures.json")
File.mkdir_p!(Path.dirname(path))
File.write!(path, Jason.encode!(fixtures))
IO.puts("Created isolated missing-intake fixtures")
