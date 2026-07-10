defmodule EasyWeb.Coaches.ProfileJSON do
  alias Easy.Orgs.Coach
  alias Easy.Orgs.Business

  @spec show(%{coach: Coach.t()}) :: %{data: map()}
  def show(%{coach: coach}) do
    %{data: data(coach)}
  end

  defp data(%Coach{} = coach) do
    %{
      id: coach.id,
      first_name: coach.first_name,
      last_name: coach.last_name,
      email: coach.user.email,
      phone: coach.phone,
      is_owner: coach.business.owner_id == coach.user_id,
      business: business(coach.business)
    }
  end

  defp business(%Business{} = business) do
    %{
      id: business.id,
      name: business.name,
      slug: business.handle,
      whatsapp_number: business.whatsapp_number,
      dashboard_setup_hidden_at: business.dashboard_setup_hidden_at,
      dashboard_setup_hidden_reason: business.dashboard_setup_hidden_reason
    }
  end
end
