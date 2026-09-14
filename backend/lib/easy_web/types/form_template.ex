defmodule EasyWeb.Types.FormTemplateQuestion do
  use EasyWeb.Type

  @type t ::
          %{
            required(:id) => String.t(),
            required(:label) => String.t(),
            required(:type) =>
              :text
              | :number
              | :boolean
              | :date
              | :select
              | :multi_select
              | :rating
              | :weight
              | :photo,
            optional(:required) => boolean(),
            optional(:options) => [String.t()]
          }
          | %{
              required(:id) => String.t(),
              required(:label) => String.t(),
              required(:type) => :service_type,
              optional(:required) => boolean()
            }
end

defmodule EasyWeb.Types.FormTemplateSection do
  use EasyWeb.Type

  @type t :: %{
          required(:questions) => [EasyWeb.Types.FormTemplateQuestion.t()],
          optional(:title) => String.t()
        }
end

defmodule EasyWeb.Types.FormTemplate do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:revision) => pos_integer(),
          required(:purpose) => :intake | :check_in,
          required(:sections) => [
            %{
              required(:questions) => [EasyWeb.Types.FormTemplateQuestion.t()],
              optional(:title) => String.t()
            }
          ],
          required(:status) => :active | :archived,
          required(:is_default_intake) => boolean(),
          required(:question_count) => non_neg_integer(),
          required(:response_count) => non_neg_integer(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:purpose) => :intake | :check_in,
          optional(:status) => :active | :archived
        }

  @spec format(Easy.Forms.FormTemplate.t() | map()) :: t()
  def format(template) when is_map(template) do
    count =
      Enum.reduce(template.sections, 0, fn section, count ->
        count + length(Map.get(section, "questions", Map.get(section, :questions, [])))
      end)

    template |> take() |> Map.put(:question_count, count)
  end

  @type create :: %{
          required(:name) => String.t(),
          required(:purpose) => :intake | :check_in,
          required(:sections) => [EasyWeb.Types.FormTemplateSection.t()],
          optional(:status) => :active | :archived
        }

  @type update :: %{
          optional(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:sections) => [EasyWeb.Types.FormTemplateSection.t()],
          optional(:status) => :active | :archived
        }

  @type mutation_query :: %{optional(:expected_revision) => pos_integer()}
end

defmodule EasyWeb.Types.FormTemplateManagement do
  use EasyWeb.Type

  @type t :: %{
          required(:template) => EasyWeb.Types.FormTemplate.t(),
          required(:assignment_count) => non_neg_integer(),
          required(:schedule_count) => non_neg_integer(),
          required(:active_schedule_count) => non_neg_integer(),
          required(:delete_blocked_reason) => :assignments | :schedules | :built_in | nil
        }
end

defmodule EasyWeb.Types.FormTemplateIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.FormTemplate.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end
