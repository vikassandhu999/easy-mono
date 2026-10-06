defmodule Easy.Reviews.Snapshot do
  alias Easy.Clients.Client
  alias Easy.Ctx
  @salt "review-screen-v1"
  @spec sign(Ctx.t(), Client.t(), DateTime.t()) :: String.t()
  def sign(ctx, client, seen_at) do
    Phoenix.Token.sign(EasyWeb.Endpoint, @salt, %{
      business_id: ctx.business_id,
      coach_id: ctx.coach_id,
      client_id: client.id,
      term_id: term_id(client),
      seq: client.last_change_seq,
      seen_at: seen_at
    })
  end

  @spec verify(Ctx.t(), Client.t(), String.t() | nil) :: {:ok, map()} | {:error, atom()}
  def verify(_ctx, %{current_term: nil}, _token), do: {:error, :coaching_required}

  def verify(ctx, client, token) do
    case Phoenix.Token.verify(EasyWeb.Endpoint, @salt, token, max_age: 86_400) do
      {:ok, %{business_id: business, coach_id: coach, client_id: id, term_id: term} = data}
      when business == ctx.business_id and coach == ctx.coach_id and id == client.id ->
        if term == term_id(client), do: {:ok, data}, else: {:error, :conflict}

      _ ->
        {:error, :conflict}
    end
  end

  defp term_id(%{current_term: nil}), do: nil
  defp term_id(client), do: client.current_term.id
end
