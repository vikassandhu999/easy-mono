defmodule EasyWeb.Types do
  @type json() ::
          String.t()
          | number()
          | boolean()
          | nil
          | [json()]
          | %{String.t() => json()}

  @type data(t) :: %{required(:data) => t}

  @type page(t) :: %{required(:data) => [t], required(:count) => non_neg_integer()}
end
