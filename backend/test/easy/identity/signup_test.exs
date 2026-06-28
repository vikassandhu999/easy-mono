defmodule Easy.Identity.SignupTest do
  use Easy.DataCase, async: true

  alias Easy.Identity.Signup

  describe "signup/1" do
    test "returns a changeset error when email is missing" do
      assert {:error, %Ecto.Changeset{} = changeset} = Signup.signup(%{})

      assert %{email: ["can't be blank"]} = errors_on(changeset)
    end
  end
end
