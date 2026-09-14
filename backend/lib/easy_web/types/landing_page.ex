defmodule EasyWeb.Types.LandingPage do
  use EasyWeb.Type

  alias Easy.Landing.{LandingPage, LandingProgram}
  alias Easy.Orgs.Business

  @type t :: %{
          required(:id) => String.t(),
          required(:slug) => String.t(),
          required(:revision) => pos_integer(),
          required(:template) => :proof_first | :problem_fit | :coach_story,
          required(:eyebrow) => String.t() | nil,
          required(:headline) => String.t(),
          required(:subheadline) => String.t() | nil,
          required(:coach_intro) => String.t() | nil,
          required(:hero_image_url) => String.t() | nil,
          required(:proof_points) => [
            %{
              optional(:label) => String.t(),
              optional(:value) => String.t()
            }
          ],
          required(:fit_points) => [String.t()],
          required(:application_questions) => [
            %{
              optional(:id) => String.t(),
              optional(:label) => String.t(),
              optional(:type) => :short_text | :long_text | :single_select,
              optional(:options) => [String.t()]
            }
          ],
          required(:status) => :draft | :published,
          required(:programs) => [
            %{
              required(:id) => String.t(),
              required(:name) => String.t(),
              required(:audience) => String.t() | nil,
              required(:promise) => String.t() | nil,
              required(:description) => String.t() | nil,
              required(:price_display) => String.t() | nil,
              required(:position) => non_neg_integer()
            }
          ],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type upsert :: %{
          required(:slug) => String.t(),
          optional(:expected_revision) => non_neg_integer(),
          required(:template) => :proof_first | :problem_fit | :coach_story,
          required(:headline) => String.t(),
          required(:status) => :draft | :published,
          optional(:eyebrow) => String.t() | nil,
          optional(:subheadline) => String.t() | nil,
          optional(:coach_intro) => String.t() | nil,
          optional(:hero_image_url) => String.t() | nil,
          optional(:proof_points) => [
            %{
              optional(:label) => String.t(),
              optional(:value) => String.t()
            }
          ],
          optional(:fit_points) => [String.t()],
          optional(:application_questions) => [
            %{
              optional(:id) => String.t(),
              optional(:label) => String.t(),
              optional(:type) => :short_text | :long_text | :single_select,
              optional(:options) => [String.t()]
            }
          ],
          optional(:programs) => [
            %{
              optional(:id) => String.t(),
              required(:name) => String.t(),
              optional(:audience) => String.t() | nil,
              optional(:promise) => String.t() | nil,
              optional(:description) => String.t() | nil,
              optional(:price_display) => String.t() | nil
            }
          ]
        }

  @type public :: %{
          required(:id) => String.t(),
          required(:slug) => String.t(),
          required(:revision) => pos_integer(),
          required(:template) => :proof_first | :problem_fit | :coach_story,
          required(:eyebrow) => String.t() | nil,
          required(:headline) => String.t(),
          required(:subheadline) => String.t() | nil,
          required(:coach_intro) => String.t() | nil,
          required(:hero_image_url) => String.t() | nil,
          required(:proof_points) => [
            %{
              optional(:label) => String.t(),
              optional(:value) => String.t()
            }
          ],
          required(:fit_points) => [String.t()],
          required(:application_questions) => [
            %{
              optional(:id) => String.t(),
              optional(:label) => String.t(),
              optional(:type) => :short_text | :long_text | :single_select,
              optional(:options) => [String.t()]
            }
          ],
          required(:programs) => [
            %{
              required(:id) => String.t(),
              required(:name) => String.t(),
              required(:audience) => String.t() | nil,
              required(:promise) => String.t() | nil,
              required(:description) => String.t() | nil,
              required(:price_display) => String.t() | nil,
              required(:position) => non_neg_integer()
            }
          ],
          required(:business_name) => String.t(),
          required(:whatsapp_number) => String.t() | nil
        }

  @type application :: %{
          optional(:landing_page_id) => String.t(),
          optional(:request_id) => String.t(),
          optional(:expected_revision) => pos_integer(),
          required(:name) => String.t(),
          optional(:phone) => String.t() | nil,
          optional(:email) => String.t() | nil,
          optional(:instagram) => String.t() | nil,
          optional(:landing_program_id) => String.t() | nil,
          optional(:answers) => %{String.t() => EasyWeb.TypedRoute.Types.json()}
        }

  @type application_result :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:program_name) => String.t() | nil,
          required(:business_name) => String.t(),
          required(:whatsapp_number) => String.t() | nil
        }

  @spec format(LandingPage.t()) :: t()
  def format(%LandingPage{} = page) do
    %{
      id: page.id,
      slug: page.slug,
      revision: page.revision,
      template: page.template,
      eyebrow: page.eyebrow,
      headline: page.headline,
      subheadline: page.subheadline,
      coach_intro: page.coach_intro,
      hero_image_url: page.hero_image_url,
      proof_points: page.proof_points || [],
      fit_points: page.fit_points || [],
      application_questions: page.application_questions || [],
      status: page.status,
      programs: Enum.map(page.programs, &program/1),
      inserted_at: page.inserted_at,
      updated_at: page.updated_at
    }
  end

  @spec public(LandingPage.t(), Business.t()) :: public()
  def public(%LandingPage{} = page, %Business{} = business) do
    %{
      id: page.id,
      slug: page.slug,
      revision: page.revision,
      template: page.template,
      eyebrow: page.eyebrow,
      headline: page.headline,
      subheadline: page.subheadline,
      coach_intro: page.coach_intro,
      hero_image_url: page.hero_image_url,
      proof_points: page.proof_points || [],
      fit_points: page.fit_points || [],
      application_questions: page.application_questions || [],
      programs: Enum.map(page.programs, &program/1),
      business_name: business.name,
      whatsapp_number: business.whatsapp_number
    }
  end

  @spec application(map()) :: application_result()
  def application(%{prospect: prospect, business: %Business{} = business, program: program}) do
    %{
      id: prospect.id,
      name: prospect.name,
      program_name: submitted_program_name(prospect.submitted_program, program),
      business_name: business.name,
      whatsapp_number: business.whatsapp_number
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

  defp submitted_program_name(%{"name" => name}, _program), do: name
  defp submitted_program_name(nil, program), do: program_name(program)

  defp program_name(%LandingProgram{name: name}), do: name
  defp program_name(nil), do: nil
end
