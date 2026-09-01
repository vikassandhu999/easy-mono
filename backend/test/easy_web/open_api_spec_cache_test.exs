defmodule EasyWeb.OpenApiSpecCacheTest do
  use ExUnit.Case, async: true

  alias EasyWeb.ApiSpec
  alias OpenApiSpex.Plug.{Cache, NoneCache}

  test "test env keeps the OpenAPI spec cache" do
    refute Cache.adapter() == NoneCache
  end

  test "NoneCache does not retain a spec" do
    spec = ApiSpec.spec()
    :ok = NoneCache.put(ApiSpec, {spec, %{}})
    assert NoneCache.get(ApiSpec) == nil
  end
end
