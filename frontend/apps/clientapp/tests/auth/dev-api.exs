if Mix.env() != :dev, do: raise("Use MIX_ENV=dev")
Logger.configure(level: :warning)
Application.put_env(:easy, Easy.Repo, Keyword.merge(Application.get_env(:easy, Easy.Repo), database: "easy_clientapp_rebuild_dev", hostname: "127.0.0.1", port: 5440, username: "admin"))
Application.put_env(:easy, Easy.Mailer, adapter: Swoosh.Adapters.Local)
Application.put_env(:easy, :start_client_subscription_sweeper, false)
Application.put_env(:easy, :client_frontend_url, "http://localhost:1315")
if endpoint = System.get_env("CLIENT_STORAGE_URL") do
  Application.put_env(:easy, Easy.Storage, Keyword.put(Application.get_env(:easy, Easy.Storage), :endpoint, endpoint))
end
Mix.Task.run("ecto.create", ["--quiet"])
Mix.Task.run("ecto.migrate", ["--quiet"])
Application.put_env(:easy, EasyWeb.Endpoint, Keyword.put(Application.get_env(:easy, EasyWeb.Endpoint), :server, true))
{:ok, _} = Application.ensure_all_started(:easy)
IO.puts("Client rebuild API: isolated database and local mail delivery")
