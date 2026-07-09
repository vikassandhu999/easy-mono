defmodule Easy.ChannelCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      import Easy.ChannelCase
      import Easy.Factory

      @endpoint EasyWeb.Endpoint
    end
  end

  setup tags do
    Easy.DataCase.setup_sandbox(tags)
    :ok
  end

  @spec coach_token(Easy.Orgs.Coach.t()) :: String.t()
  def coach_token(coach) do
    business = Easy.Repo.get!(Easy.Orgs.Business, coach.business_id)

    Joken.generate_and_sign!(
      Easy.Identity.Token.token_config(),
      %{
        user_id: coach.user_id,
        session_id: Ecto.UUID.generate(),
        role: "coach",
        business_id: coach.business_id,
        coach_id: coach.id,
        is_owner: business.owner_id == coach.user_id
      },
      Easy.Identity.Token.signer()
    )
  end

  @spec client_token(Easy.Clients.Client.t()) :: String.t()
  def client_token(client) do
    Joken.generate_and_sign!(
      Easy.Identity.Token.token_config(),
      %{
        user_id: client.user_id,
        session_id: Ecto.UUID.generate(),
        role: "client",
        business_id: client.business_id
      },
      Easy.Identity.Token.signer()
    )
  end
end
