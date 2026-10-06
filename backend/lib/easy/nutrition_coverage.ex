defmodule Easy.Nutrition.Coverage do
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Plans.Reader
  @spec get_coverage_for_client(Ctx.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def get_coverage_for_client(ctx, client_id) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, page} <- Reader.list_plan_page_for_client(ctx, client_id, :nutrition, limit: 100) do
      {:ok,
       %{
         date: Client.local_date(client, DateTime.utc_now()),
         current: Enum.find(page.data, &(&1.lifecycle == :current)),
         upcoming: Enum.filter(page.data, &(&1.lifecycle == :upcoming))
       }}
    end
  end
end
