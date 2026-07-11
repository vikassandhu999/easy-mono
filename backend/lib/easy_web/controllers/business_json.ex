defmodule EasyWeb.BusinessJSON do
  alias Easy.Orgs.Business

  @spec show(%{business: Business.t()}) :: %{data: map()}
  def show(%{business: business}) do
    %{data: data(business)}
  end

  defp data(%Business{} = business) do
    %{
      id: business.id,
      name: business.name,
      handle: business.handle,
      about: business.about,
      default_weight_unit: business.default_weight_unit,
      dashboard_setup_hidden_at: business.dashboard_setup_hidden_at,
      dashboard_setup_hidden_reason: business.dashboard_setup_hidden_reason,
      inserted_at: business.inserted_at,
      updated_at: business.updated_at
    }
  end
end
