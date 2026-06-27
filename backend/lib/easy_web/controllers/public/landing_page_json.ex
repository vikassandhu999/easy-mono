defmodule EasyWeb.Public.LandingPageJSON do
  alias Easy.Landing.{LandingPage, LandingProgram}
  alias Easy.Orgs.Business

  @spec show(%{result: map()}) :: %{data: map()}
  def show(%{result: %{page: %LandingPage{} = page, business: %Business{} = business}}) do
    %{
      data: %{
        slug: page.slug,
        template: page.template,
        headline: page.headline,
        subheadline: page.subheadline,
        coach_intro: page.coach_intro,
        proof_points: page.proof_points,
        application_questions: page.application_questions,
        programs: Enum.map(page.programs, &program/1),
        business_name: business.name,
        whatsapp_number: business.whatsapp_number
      }
    }
  end

  @spec apply(%{result: map()}) :: %{data: map()}
  def apply(%{result: %{prospect: prospect, business: %Business{} = business, program: program}}) do
    %{
      data: %{
        id: prospect.id,
        name: prospect.name,
        program_name: program_name(program),
        business_name: business.name,
        whatsapp_number: business.whatsapp_number
      }
    }
  end

  defp program(%LandingProgram{} = program) do
    %{
      id: program.id,
      name: program.name,
      audience: program.audience,
      promise: program.promise,
      description: program.description,
      price_display: program.price_display,
      position: program.position
    }
  end

  defp program_name(%LandingProgram{name: name}), do: name
  defp program_name(_), do: nil
end
