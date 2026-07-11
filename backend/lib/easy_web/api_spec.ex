defmodule EasyWeb.ApiSpec do
  alias EasyWeb.{Endpoint, Router}
  alias OpenApiSpex.{Components, Info, OpenApi, Paths, SecurityScheme, Server}

  @behaviour OpenApi

  @impl OpenApi
  def spec do
    %OpenApi{
      servers: [Server.from_endpoint(Endpoint)],
      info: %Info{title: "Easy API", version: "1.0"},
      paths: Paths.from_router(Router),
      components: %Components{
        securitySchemes: %{
          "bearerAuth" => %SecurityScheme{type: "http", scheme: "bearer"}
        }
      }
    }
    |> OpenApiSpex.resolve_schema_modules()
  end
end
