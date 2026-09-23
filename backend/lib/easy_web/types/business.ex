defmodule EasyWeb.Types.Business do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:handle) => String.t(),
          required(:about) => String.t() | nil,
          required(:default_weight_unit) => :kg | :lbs,
          required(:timezone) => String.t(),
          required(:whatsapp_number) => String.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          required(:handle) => String.t(),
          optional(:about) => String.t() | nil,
          optional(:default_weight_unit) => :kg | :lbs
        }

  @type update :: %{
          optional(:name) => String.t(),
          optional(:about) => String.t() | nil,
          optional(:timezone) => String.t(),
          optional(:whatsapp_number) => String.t() | nil,
          optional(:default_weight_unit) => :kg | :lbs
        }

  @type timezone_options :: %{required(:timezones) => [String.t()]}
end
