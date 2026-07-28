# Dev repair: give every non-pending client a linked, email-confirmed User.
#
#   mix run priv/repo/dev_link_client_users.exs
#
# Why this exists: a client only gets its `user_id` by accepting an invitation —
# that is the step that creates the User and links it (see
# Identity.Invitations.verify_invitation/1). Seeded/dummy clients are written
# straight into the table as `active`, so they skip it and end up active with
# `user_id: nil`. They then cannot log in at all: /v1/auth/otp looks the address
# up in `users`, misses, and answers 404 "User not found" before an OTP is ever
# minted. Nothing in the app is broken — the fixture is simply half-built.
#
# `pending` clients are skipped on purpose. Having no user is the CORRECT state
# for an invitation nobody has accepted yet, and linking one would let a tester
# log in as a client who never went through acceptance.
#
# Idempotent: re-running only touches clients that still have no user.

import Ecto.Query

alias Easy.Clients.Client
alias Easy.Identity.User
alias Easy.Identity.Users
alias Easy.Repo

unlinked =
  Repo.all(
    from c in Client,
      where: is_nil(c.user_id) and c.status != ^:pending,
      order_by: c.email
  )

IO.puts("clients missing a user (excluding pending): #{length(unlinked)}")

{linked, skipped} =
  Enum.reduce(unlinked, {0, 0}, fn client, {linked, skipped} ->
    cond do
      is_nil(client.email) or client.email == "" ->
        IO.puts("  SKIP #{client.id} — no email to key a user on")
        {linked, skipped + 1}

      true ->
        # Mirrors Invitations.find_or_create_confirmed_user/2: reuse an existing
        # user for this address if there is one, otherwise create it confirmed.
        user_result =
          case Users.get_by_email(client.email) do
            {:ok, user} ->
              if User.email_confirmed?(user), do: {:ok, user}, else: Users.confirm_user_email(user)

            {:error, _} ->
              with {:ok, user} <-
                     Users.create(%{
                       "email" => client.email,
                       "first_name" => client.first_name || "",
                       "last_name" => client.last_name || "",
                       "confirmation_sent_at" => DateTime.utc_now(:second)
                     }) do
                Users.confirm_user_email(user)
              end
          end

        case user_result do
          {:ok, user} ->
            # A plain link, not Clients.accept_invite/3 — that function is the
            # pending -> active transition and refuses a client that is already
            # active (`:race_lost`). Nothing here changes status or stage.
            client
            |> Ecto.Changeset.change(user_id: user.id)
            |> Repo.update!()

            {linked + 1, skipped}

          {:error, reason} ->
            IO.puts("  SKIP #{client.email} — #{inspect(reason)}")
            {linked, skipped + 1}
        end
    end
  end)

IO.puts("linked: #{linked}, skipped: #{skipped}")

remaining = Repo.aggregate(from(c in Client, where: is_nil(c.user_id) and c.status != ^:pending), :count)
IO.puts("still unlinked (should be 0 unless skipped above): #{remaining}")
