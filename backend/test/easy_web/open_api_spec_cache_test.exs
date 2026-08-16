defmodule EasyWeb.OpenApiSpecCacheTest do
  use ExUnit.Case, async: true

  test "test env keeps the OpenAPI spec cache" do
    refute OpenApiSpex.Plug.Cache.adapter() == OpenApiSpex.Plug.NoneCache
  end

  test "NoneCache does not retain a spec" do
    spec = EasyWeb.ApiSpec.spec()
    :ok = OpenApiSpex.Plug.NoneCache.put(EasyWeb.ApiSpec, {spec, %{}})
    assert OpenApiSpex.Plug.NoneCache.get(EasyWeb.ApiSpec) == nil
  end
end
