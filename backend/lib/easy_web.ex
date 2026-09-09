defmodule EasyWeb do
  @spec router() :: Macro.t()
  def router do
    quote do
      use Phoenix.Router, helpers: false

      # Import common connection and controller functions to use in pipelines
      import Plug.Conn
      import Phoenix.Controller
    end
  end

  @spec controller() :: Macro.t()
  def controller do
    quote do
      use Phoenix.Controller, formats: [:json], renderer: EasyWeb.AppJSON

      import Plug.Conn
      import EasyWeb.ControllerHelpers

      alias Easy.Error

      action_fallback EasyWeb.FallbackController

      unquote(verified_routes())
    end
  end

  @spec typed_controller() :: Macro.t()
  def typed_controller do
    quote do
      use EasyWeb, :controller
      use EasyWeb.TypedRoute, adapter: EasyWeb.TypedRouteAdapter
    end
  end

  @spec verified_routes() :: Macro.t()
  def verified_routes do
    quote do
      use Phoenix.VerifiedRoutes,
        endpoint: EasyWeb.Endpoint,
        router: EasyWeb.Router
    end
  end

  @spec __using__(atom()) :: Macro.t()
  defmacro __using__(which) when is_atom(which) do
    apply(__MODULE__, which, [])
  end
end
