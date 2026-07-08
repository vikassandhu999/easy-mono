defmodule Easy.DataCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      alias Easy.Repo

      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import Easy.DataCase
      import Easy.Factory
    end
  end

  setup tags do
    Easy.DataCase.setup_sandbox(tags)
    :ok
  end

  def setup_sandbox(tags) do
    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(Easy.Repo, shared: not tags[:async])
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
  end

  def errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, opts} ->
      Regex.replace(~r"%{(\w+)}", message, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  @spec owner_ctx(Easy.Orgs.Business.t()) :: Easy.Ctx.t()
  def owner_ctx(%Easy.Orgs.Business{} = business) do
    coach_id =
      Easy.Orgs.Coach
      |> Easy.Orgs.Coach.for_business(business.id)
      |> Easy.Orgs.Coach.for_user(business.owner_id)
      |> Easy.Repo.one()
      |> case do
        nil -> nil
        coach -> coach.id
      end

    Easy.Ctx.new(business.id, business.owner_id, coach_id, true)
  end

  @spec trainer_ctx(Easy.Orgs.Coach.t()) :: Easy.Ctx.t()
  def trainer_ctx(%Easy.Orgs.Coach{} = coach) do
    Easy.Ctx.new(coach.business_id, coach.user_id, coach.id, false)
  end
end
