defmodule EasyWeb.CoachJSON do
  alias Easy.Orgs.Coach

  @spec show(%{coach: Coach.t()}) :: %{data: map()}
  def show(%{coach: coach}) do
    %{data: data(coach)}
  end

  defp data(%Coach{} = coach) do
    %{
      id: coach.id,
      name: coach.name,
      title: coach.title,
      bio: coach.bio,
      inserted_at: coach.inserted_at,
      updated_at: coach.updated_at
    }
  end
end
