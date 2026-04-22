defmodule EasyWeb.Coaches.ClientWeightEntryJSON do
  alias EasyWeb.Clients.WeightEntryJSON

  @spec index(map()) :: map()
  def index(%{entries: entries, client: client, adherence: adherence}) do
    WeightEntryJSON.index(%{entries: entries, client: client})
    |> Map.put(:adherence, adherence)
  end
end
