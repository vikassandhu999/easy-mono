if Mix.env() != :dev, do: raise("Run prospects fixtures in MIX_ENV=dev")
Logger.configure(level: :warning)
Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, "easy_coachapp_auth_dev"))
Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
Application.put_env(:easy, :start_client_subscription_sweeper, false)
Application.put_env(:easy, :start_check_in_sweeper, false)
{:ok, _} = Application.ensure_all_started(:easy)
fixtures = for width <- [375, 1280] do
  suffix = "#{System.system_time(:microsecond)}-#{width}"
  email = "prospects-#{suffix}@example.test"
  {:ok, owner} = Easy.Identity.signup(%{"email" => email, "first_name" => "Kavya", "last_name" => "Sharma"})
  {:ok, _} = Easy.Identity.verify_otp(email, "123456", %{})
  {:ok, business} = Easy.Orgs.create_business(Easy.Ctx.new(nil, owner.id), %{name: "Steady Strength #{width}", handle: "inbox-#{suffix}"})
  {:ok, coach} = Easy.Coaches.get_active_coach_by_user_id(owner.id)
  ctx = Easy.Ctx.new(business.id, owner.id, coach.id, true)
  {:ok, _} = Easy.Billing.grant_free_seats(ctx, 2)
  trainer_email = "inbox-trainer-#{suffix}@example.test"
  {:ok, trainer} = Easy.CoachInvitations.invite_trainer(ctx, %{email: trainer_email, first_name: "Asha"})
  {:ok, page} = Easy.Landing.upsert_landing_page(ctx, %{slug: "inbox-#{suffix}", template: :coach_story, headline: "Strong for life", status: :published,
    programs: [%{name: "Strength for everyday life"}], application_questions: [
      %{id: "goal", label: "What would you like help with?", type: :long_text},
      %{id: "start", label: "When would you like to start?", type: :single_select, options: ["This month", "Next month"]}
    ]})
  [program] = page.programs
  applicants = for index <- 0..45 do
    name = if index == 45, do: "Later Applicant #{width}", else: "Applicant #{width} #{String.pad_leading(to_string(index), 2, "0")}"
    {:ok, %{prospect: prospect}} = Easy.Landing.submit_application(page.slug, %{name: name, email: "applicant-#{index}-#{suffix}@example.test", phone: "+44 7700 900123", landing_program_id: program.id,
      answers: %{"goal" => "Build a consistent strength routine around work and family.", "start" => "Next month"}})
    {:ok, prospect} = prospect |> Ecto.Changeset.change(inserted_at: DateTime.add(DateTime.utc_now(:second), -index * 60, :second)) |> Easy.Repo.update()
    %{id: prospect.id, name: prospect.name}
  end
  %{width: width, owner_email: email, applicants: applicants, trainer_email: trainer_email, trainer_token: trainer.invitation_token}
end
path = Path.expand("../frontend/apps/coachapp/tests/acquisition/artifacts/prospects-fixtures.json")
File.mkdir_p!(Path.dirname(path))
File.write!(path, Jason.encode!(fixtures))
IO.puts("Created isolated prospects fixtures")
