defmodule Easy.ChannelCase do
  use ExUnit.CaseTemplate

  alias Easy.Clients.Client
  alias Easy.DataCase
  alias Easy.Identity.Token
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo

  using do
    quote do
      import Phoenix.ChannelTest
      import Easy.ChannelCase
      import Easy.Factory

      @endpoint EasyWeb.Endpoint
    end
  end

  setup tags do
    DataCase.setup_sandbox(tags)
    :ok
  end

  @spec coach_token(Coach.t()) :: String.t()
  def coach_token(coach) do
    business = Repo.get!(Business, coach.business_id)

    Joken.generate_and_sign!(
      Token.token_config(),
      %{
        user_id: coach.user_id,
        session_id: Ecto.UUID.generate(),
        role: "coach",
        business_id: coach.business_id,
        coach_id: coach.id,
        is_owner: business.owner_id == coach.user_id
      },
      Token.signer()
    )
  end

  @spec client_token(Client.t()) :: String.t()
  def client_token(client) do
    Joken.generate_and_sign!(
      Token.token_config(),
      %{
        user_id: client.user_id,
        session_id: Ecto.UUID.generate(),
        role: "client",
        business_id: client.business_id
      },
      Token.signer()
    )
  end
end
