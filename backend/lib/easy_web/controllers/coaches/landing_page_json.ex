defmodule EasyWeb.Coaches.LandingPageJSON do
  alias Easy.Landing.{LandingPage, LandingProgram}

  @spec show(%{page: LandingPage.t() | nil}) :: %{data: map() | nil}
  def show(%{page: nil}), do: %{data: nil}
  def show(%{page: %LandingPage{} = page}), do: %{data: data(page)}

  @spec data(LandingPage.t()) :: map()
  def data(%LandingPage{} = page) do
    %{
      id: page.id,
      slug: page.slug,
      template: page.template,
      headline: page.headline,
      subheadline: page.subheadline,
      coach_intro: page.coach_intro,
      proof_points: page.proof_points,
      application_questions: page.application_questions,
      status: page.status,
      programs: Enum.map(page.programs, &program/1),
      inserted_at: page.inserted_at,
      updated_at: page.updated_at
    }
  end

  @spec program(LandingProgram.t()) :: map()
  def program(%LandingProgram{} = program) do
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
end
