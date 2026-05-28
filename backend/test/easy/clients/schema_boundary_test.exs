defmodule Easy.Clients.SchemaBoundaryTest do
  use ExUnit.Case, async: true

  @schema_paths [
    "lib/easy/clients/client.ex"
  ]

  @context_verbs [
    "accept_invite",
    "create_inquiry",
    "get_for_user",
    "get_profile",
    "invite",
    "preload_client",
    "resend_invitation",
    "resolve_invitation_token",
    "revoke_invitation",
    "self_update",
    "summary",
    "update"
  ]

  test "client schemas do not call Repo" do
    for path <- @schema_paths do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Repo", path
      refute source =~ ~r/\bRepo\./, path
    end
  end

  test "client schemas do not expose context workflow functions" do
    verb_pattern = Enum.join(@context_verbs, "|")

    for path <- @schema_paths do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ ~r/^\s+def (#{verb_pattern})\b/m, path
    end
  end
end
