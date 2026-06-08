defmodule EasyWeb.ClientControllerBoundaryTest do
  use ExUnit.Case, async: true

  @client_controllers [
    "lib/easy_web/controllers/coaches/client_controller.ex",
    "lib/easy_web/controllers/clients/profile_controller.ex",
    "lib/easy_web/controllers/clients/weight_entry_controller.ex",
    "lib/easy_web/controllers/coaches/client_weight_entry_controller.ex",
    "lib/easy_web/controllers/auth_controller.ex",
    "lib/easy_web/controllers/public/storefront_controller.ex"
  ]

  test "client controllers do not call Repo directly" do
    for path <- @client_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Repo", path
      refute source =~ ~r/\bRepo\./, path
    end
  end

  test "client controllers do not call schema actions or the old read boundary" do
    for path <- @client_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Clients.Reads", path

      refute source =~
               ~r/\bClient\.(accept_invite|create_inquiry|get_for_user|get_profile|invite|resend_invitation|resolve_invitation_token|revoke_invitation|self_update|update)\(/,
             path

      refute source =~ ~r/\bWeightEntry\.(adherence|delete|upsert)\(/, path
    end
  end
end
