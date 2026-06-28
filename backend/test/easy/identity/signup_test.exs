defmodule Easy.Identity.SignupTest do
  use Easy.DataCase, async: true

  alias Easy.Identity.Signup

  describe "signup/1" do
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
