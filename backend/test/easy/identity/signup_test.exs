defmodule Easy.Identity.SignupTest do
  use Easy.DataCase, async: true

  alias Easy.Identity.Signup

  describe "signup/1" do
    for key_type <- [:atom, :string] do
      test "accepts #{key_type} keys and owns the confirmation timestamp" do
        email = "signup-#{System.unique_integer([:positive])}@example.com"
        now = DateTime.utc_now(:second)
        attrs = %{email: email, first_name: "Alex", confirmation_sent_at: ~U[2000-01-01 00:00:00Z]}

        attrs =
          case unquote(key_type) do
            :string -> Map.new(attrs, fn {k, v} -> {to_string(k), v} end)
            :atom -> attrs
          end

        assert {:ok, user} = Signup.signup(attrs)
        assert user.email == email
        assert user.first_name == "Alex"
        assert DateTime.compare(user.confirmation_sent_at, now) in [:eq, :gt]
        assert user.email_confirmed_at == nil
      end
    end

    test "invalid atom-keyed attributes return validation errors" do
      assert {:error, %Ecto.Changeset{} = changeset} = Signup.signup(%{email: "invalid"})
      assert %{email: ["has invalid format"]} = errors_on(changeset)
    end

    test "returns a changeset error when email is missing" do
      assert {:error, %Ecto.Changeset{} = changeset} = Signup.signup(%{})

      assert %{email: ["can't be blank"]} = errors_on(changeset)
    end

    test "resending confirmation OTP for an unconfirmed email succeeds" do
      email = "unconfirmed-#{System.unique_integer([:positive])}@example.com"
      insert(:user, email: email, email_confirmed_at: nil)

      assert {:ok, user} = Signup.signup(%{"email" => email})
      assert user.email == email
    end
  end
end
