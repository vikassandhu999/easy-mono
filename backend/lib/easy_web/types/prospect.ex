defmodule EasyWeb.Types.Prospect do
  use EasyWeb.Type

  alias Easy.Clients.Client
  alias Easy.Landing.{LandingPage, LandingProgram, Prospect}

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:revision) => pos_integer(),
          required(:enrollment_defaults) => %{
            required(:first_name) => String.t() | nil,
            required(:last_name) => String.t() | nil,
            required(:email) => String.t() | nil,
            required(:phone) => String.t() | nil
          },
          required(:answer_rows) => [
            %{
              required(:question_id) => String.t(),
              required(:label) => String.t(),
              required(:value) => String.t() | nil
            }
          ],
          required(:phone) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:instagram) => String.t() | nil,
          required(:submitted_questions) => [%{String.t() => EasyWeb.TypedRoute.Types.json()}],
          required(:answers) => %{String.t() => EasyWeb.TypedRoute.Types.json()},
          required(:status) => :new | :reviewing | :won | :lost,
          required(:notes) => String.t() | nil,
          required(:landing_page_slug) => String.t() | nil,
          required(:program) =>
            %{
              required(:id) => String.t(),
              required(:name) => String.t()
            }
            | nil,
          required(:client) =>
            %{
              required(:id) => String.t(),
              required(:first_name) => String.t() | nil,
              required(:last_name) => String.t() | nil,
              required(:status) => :pending | :active | :inactive
            }
            | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type update :: %{
          optional(:expected_revision) => pos_integer(),
          required(:status) => :new | :reviewing | :won | :lost,
          optional(:notes) => String.t() | nil
        }

  @type enroll :: %{
          optional(:expected_revision) => pos_integer(),
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil,
          optional(:email) => String.t() | nil,
          optional(:phone) => String.t() | nil
        }

  @type list_query :: %{
          optional(:status) => :new | :reviewing | :won | :lost,
          optional(:search) => String.t(),
          optional(:cursor) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer()
        }

  @spec format(Prospect.t()) :: t()
  def format(%Prospect{} = prospect) do
    %{
      id: prospect.id,
      name: prospect.name,
      revision: prospect.revision,
      enrollment_defaults: Prospect.invitation_attrs(prospect, %{}),
      answer_rows: Easy.ProspectAnswers.rows(prospect),
      phone: prospect.phone,
      email: prospect.email,
      instagram: prospect.instagram,
      answers: prospect.answers,
      submitted_questions: prospect.submitted_questions,
      status: prospect.status,
      notes: prospect.notes,
      landing_page_slug: page_slug(prospect.landing_page),
      program: submitted_program(prospect),
      client: client(prospect.client),
      inserted_at: prospect.inserted_at,
      updated_at: prospect.updated_at
    }
  end

  defp page_slug(%LandingPage{slug: slug}), do: slug
  defp page_slug(nil), do: nil

  defp submitted_program(%Prospect{submitted_program: %{"id" => id, "name" => name}}), do: %{id: id, name: name}
  defp submitted_program(prospect), do: program(prospect.landing_program)

  defp program(%LandingProgram{} = program), do: %{id: program.id, name: program.name}
  defp program(nil), do: nil

  defp client(%Client{} = client) do
    %{id: client.id, first_name: client.first_name, last_name: client.last_name, status: client.status}
  end

  defp client(nil), do: nil
end

defmodule EasyWeb.Types.ProspectIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Prospect.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil,
          required(:summary) => %{
            required(:new) => non_neg_integer(),
            required(:reviewing) => non_neg_integer(),
            required(:won) => non_neg_integer(),
            required(:lost) => non_neg_integer()
          }
        }
end

defmodule EasyWeb.Types.ProspectEnrollment do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => %{
            required(:prospect) => EasyWeb.Types.Prospect.t(),
            required(:already_enrolled) => boolean()
          }
        }
end
