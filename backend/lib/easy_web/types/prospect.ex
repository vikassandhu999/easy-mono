defmodule EasyWeb.Types.Prospect do
  use EasyWeb.Type

  alias Easy.Clients.Client
  alias Easy.Landing.{LandingPage, LandingProgram, Prospect}

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:phone) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:instagram) => String.t() | nil,
          required(:answers) => %{String.t() => EasyWeb.Types.json()},
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
          required(:status) => :new | :reviewing | :won | :lost,
          optional(:notes) => String.t() | nil
        }

  @type enroll :: %{
          optional(:first_name) => String.t() | nil,
          optional(:last_name) => String.t() | nil,
          optional(:email) => String.t() | nil,
          optional(:phone) => String.t() | nil
        }

  @type list_query :: %{
          optional(:status) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer()
        }

  @spec format(Prospect.t()) :: t()
  def format(%Prospect{} = prospect) do
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
  defp page_slug(nil), do: nil

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
