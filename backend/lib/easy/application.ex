defmodule Easy.Application do
  use Application

  @impl true
  @spec start(Application.start_type(), term()) :: Supervisor.on_start()
  def start(_type, _args) do
    children =
      [
        Easy.Repo,
        {Phoenix.PubSub, name: Easy.PubSub},
        {Task.Supervisor, name: Easy.TaskSupervisor},
        Supervisor.child_spec(
          {Task.Supervisor, name: Easy.MailerSupervisor, max_children: 20},
          id: Easy.MailerSupervisor
        )
      ] ++ [EasyWeb.Endpoint]

    opts = [strategy: :one_for_one, name: Easy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  @spec config_change(keyword(), keyword(), [atom()]) :: :ok
  def config_change(changed, _new, removed) do
    EasyWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
