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
          required(:purpose) => :intake | :check_in,
          required(:sections) => [
            %{
              required(:questions) => [EasyWeb.Types.FormTemplateQuestion.t()],
              optional(:title) => String.t()
            }
          ],
          required(:status) => :active | :archived,
          required(:is_default_intake) => boolean(),
          required(:response_count) => non_neg_integer(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          required(:purpose) => :intake | :check_in,
          required(:sections) => [EasyWeb.Types.FormTemplateSection.t()],
          optional(:status) => :active | :archived
        }

  @type update :: %{
          optional(:name) => String.t(),
          optional(:sections) => [EasyWeb.Types.FormTemplateSection.t()],
          optional(:status) => :active | :archived
        }
end
