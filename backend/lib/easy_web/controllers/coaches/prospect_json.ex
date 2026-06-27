defmodule EasyWeb.Coaches.ProspectJSON do
  alias Easy.Clients.Client
  alias Easy.Landing.{LandingPage, LandingProgram, Prospect}

  @spec index(%{result: map()}) :: %{data: [map()], count: non_neg_integer(), summary: map()}
  def index(%{result: %{prospects: prospects, count: count, summary: summary}}) do
    %{data: Enum.map(prospects, &data/1), count: count, summary: summary}
  end

  @spec show(%{prospect: Prospect.t()}) :: %{data: map()}
  def show(%{prospect: prospect}), do: %{data: data(prospect)}

  @spec enroll(%{result: map()}) :: %{data: map()}
  def enroll(%{result: %{prospect: prospect, already_enrolled: already_enrolled}}) do
    %{data: %{prospect: data(prospect), already_enrolled: already_enrolled}}
  end

  @spec data(Prospect.t()) :: map()
  def data(%Prospect{} = prospect) do
    %{
      id: prospect.id,
      name: prospect.name,
      phone: prospect.phone,
      email: prospect.email,
      instagram: prospect.instagram,
      answers: prospect.answers,
      status: prospect.status,
      notes: prospect.notes,
      landing_page_slug: page_slug(prospect.landing_page),
      program: program(prospect.landing_program),
      client: client(prospect.client),
      inserted_at: prospect.inserted_at,
      updated_at: prospect.updated_at
    }
  end

  defp page_slug(%LandingPage{slug: slug}), do: slug
  defp page_slug(_), do: nil

  defp program(%LandingProgram{} = program), do: %{id: program.id, name: program.name}
  defp program(_), do: nil

  defp client(%Client{} = client) do
    %{id: client.id, first_name: client.first_name, last_name: client.last_name, status: client.status}
  end

  defp client(_), do: nil
end
