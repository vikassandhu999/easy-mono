defmodule Easy.Identity.OtpDeliveryTest do
  use Easy.DataCase, async: true

  alias Easy.Identity.{OneTimeToken, OneTimeTokens, OtpDelivery}

  test "invalid account states preserve the existing code" do
    confirmed = insert(:user, email_confirmed_at: DateTime.utc_now(:second))
    unconfirmed = insert(:user, email_confirmed_at: nil)

    for {user, type, error} <- [
          {confirmed, :email_confirmation, :email_already_confirmed},
          {unconfirmed, :authentication, :email_not_confirmed}
        ] do
      assert {:ok, token} = OneTimeTokens.create_token(user, type, "existing-code")
      before = Repo.get!(OneTimeToken, token.id)
      assert {:error, ^error} = OtpDelivery.send_otp(user.email, Atom.to_string(type))
      assert Repo.get!(OneTimeToken, token.id) == before
      assert [^before] = Repo.all(OneTimeToken.issued_to_user(user.id, type))
    end
  end

  test "missing accounts return user_not_found without issuing a token" do
    email = "missing-otp-user@example.test"

    for type <- ["email_confirmation", "authentication", "unknown"] do
      assert {:error, :user_not_found} = OtpDelivery.send_otp(email, type)
    end

    refute Repo.get_by(OneTimeToken, relates_to: email)
  end

  for {input_type, token_type, confirmed?} <- [
        {"email_confirmation", :email_confirmation, false},
        {"authentication", :authentication, true},
        {"unknown", :authentication, true}
      ] do
    other_type = if token_type == :authentication, do: :email_confirmation, else: :authentication

    test "#{input_type} replaces only its token type and dispatches the new code" do
      confirmed_at = if unquote(confirmed?), do: DateTime.utc_now(:second)
      user = insert(:user, email_confirmed_at: confirmed_at)
      type = unquote(token_type)
      assert {:ok, old} = OneTimeTokens.create_token(user, type, "old-code")
      assert {:ok, other} = OneTimeTokens.create_token(user, unquote(other_type), "other-code")
      other_before = Repo.get!(OneTimeToken, other.id)

      assert {:ok, :sent} = OtpDelivery.send_otp(user.email, unquote(input_type))
      assert_receive {:email, email}, 1_000
      assert email.to == [{"", user.email}]
      refute Repo.get(OneTimeToken, old.id)
      assert [replacement] = Repo.all(OneTimeToken.issued_to_user(user.id, type))
      refute replacement.token_hash == old.token_hash
      assert Repo.get!(OneTimeToken, other.id) == other_before
    end
  end
end
