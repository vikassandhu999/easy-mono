defmodule EasyWeb.Types.CheckInSchedule do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:client_id) => String.t(),
          required(:form_template_id) => String.t(),
          required(:frequency) => :once | :weekly | :biweekly | :monthly,
          required(:next_due_on) => Date.t(),
          required(:active) => boolean(),
          required(:form_template) => EasyWeb.Types.FormTemplate.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:form_template_id) => String.t(),
          required(:frequency) => :once | :weekly | :biweekly | :monthly,
          required(:next_due_on) => Date.t()
        }

  @type update :: %{
          optional(:frequency) => :once | :weekly | :biweekly | :monthly,
          optional(:next_due_on) => Date.t(),
          optional(:active) => boolean()
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:active) => boolean()
        }
end

defmodule EasyWeb.Types.CheckInScheduleIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.CheckInSchedule.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end
