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
end
