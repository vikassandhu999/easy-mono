defmodule EasyWeb.TypedRoute.Adapter do
  @type route :: map()
  @type routes :: %{optional(atom()) => route()}
  @type header_requirement :: %{required(:name) => String.t(), required(:required?) => boolean()}

  @callback enrich_routes(routes(), list(), Macro.Env.t()) :: routes()
  @callback headers(map(), route()) :: [header_requirement()]
  @callback reject(Plug.Conn.t(), map()) :: Plug.Conn.t()
end
