defmodule Easy.Identity.Errors do
  alias Easy.Error

  @spec invitation_invalid() :: Error.t()
  def invitation_invalid do
    Error.new(
      :invitation_invalid,
      "This invitation is no longer valid.",
      %{},
      :not_found
    )
  end

  @spec invitation_used() :: Error.t()
  def invitation_used do
    Error.new(
      :invitation_used,
      "This invitation has already been accepted.",
      %{},
      :gone
    )
  end

  @spec invitation_expired() :: Error.t()
  def invitation_expired do
    Error.new(
      :invitation_expired,
      "This invitation has expired. Ask your coach to send a new one.",
      %{},
      :gone
    )
  end

  @spec already_active_client() :: Error.t()
  def already_active_client do
    Error.new(
      :already_active_client,
      "This email is already an active client of another business.",
      %{},
      :conflict
    )
  end

  @spec already_a_coach() :: Error.t()
  def already_a_coach do
    Error.new(
      :already_a_coach,
      "This email is already associated with a coach account on another team.",
      %{},
      :conflict
    )
  end

  @spec invalid_otp() :: Error.t()
  def invalid_otp do
    Error.new(
      :invalid_otp,
      "Invalid code. Please check and try again.",
      %{},
      :unauthorized
    )
  end

  @spec otp_expired() :: Error.t()
  def otp_expired do
    Error.new(
      :otp_expired,
      "This code has expired. Request a new one.",
      %{},
      :gone
    )
  end
end
