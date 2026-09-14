if Mix.env() != :dev, do: raise("Run acquisition fixtures in MIX_ENV=dev")
Logger.configure(level: :warning)
Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, "easy_coachapp_auth_dev"))
Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
Application.put_env(:easy, :start_client_subscription_sweeper, false)
Application.put_env(:easy, :start_check_in_sweeper, false)
{:ok, _} = Application.ensure_all_started(:easy)
fixtures = for width <- [375, 1280] do
  suffix = "#{System.system_time(:microsecond)}-#{width}"
  email = "acquisition-#{suffix}@example.test"
  {:ok, owner} = Easy.Identity.signup(%{"email" => email, "first_name" => "Kavya", "last_name" => "Sharma"})
  {:ok, _} = Easy.Identity.verify_otp(email, "123456", %{})
  {:ok, _business} = Easy.Orgs.create_business(Easy.Ctx.new(nil, owner.id), %{name: "Steady Strength", handle: "strength-#{suffix}"})
  %{width: width, owner_email: email, slug: "strength-#{suffix}"}
end
path = Path.expand("../frontend/apps/coachapp/tests/acquisition/artifacts/fixtures.json")
File.mkdir_p!(Path.dirname(path))
File.write!(path, Jason.encode!(fixtures))
IO.puts("Created isolated acquisition fixtures")
