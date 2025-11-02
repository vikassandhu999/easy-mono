defmodule Easy.TenantFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Easy.Tenant` context.
  """

  @doc """
  Generate a unique business handle.
  """
  def unique_business_handle, do: "some handle#{System.unique_integer([:positive])}"

  @doc """
  Generate a business.
  """
  def business_fixture(attrs \\ %{}) do
    {:ok, business} =
      attrs
      |> Enum.into(%{
        about: "some about",
        handle: unique_business_handle(),
        logo_url: "some logo_url",
        name: "some name"
      })
      |> Easy.Tenant.create_business()

    business
  end
end
