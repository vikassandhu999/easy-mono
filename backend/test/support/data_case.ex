defmodule Easy.DataCase do
  use ExUnit.CaseTemplate

  alias Easy.Ctx
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox
  alias Ecto.Changeset

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
    __MODULE__.setup_sandbox(tags)
    :ok
  end

  def setup_sandbox(tags) do
    pid = Sandbox.start_owner!(Repo, shared: not tags[:async])
    on_exit(fn -> Sandbox.stop_owner(pid) end)
  end

  def errors_on(changeset) do
    Changeset.traverse_errors(changeset, fn {message, opts} ->
      Regex.replace(~r"%{(\w+)}", message, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  @spec owner_ctx(Business.t()) :: Ctx.t()
  def owner_ctx(%Business{} = business) do
    coach_id =
      Coach
      |> Coach.for_business(business.id)
      |> Coach.for_user(business.owner_id)
      |> Repo.one()
      |> case do
        nil -> nil
        coach -> coach.id
      end

    Ctx.new(business.id, business.owner_id, coach_id, true)
  end

  @spec trainer_ctx(Easy.Orgs.Coach.t()) :: Easy.Ctx.t()
  def trainer_ctx(%Easy.Orgs.Coach{} = coach) do
    Easy.Ctx.new(coach.business_id, coach.user_id, coach.id, false)
  end
end
