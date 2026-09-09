defmodule Easy.RuntimeConfigTest do
  use ExUnit.Case, async: false

  @runtime_path Path.expand("../../config/runtime.exs", __DIR__)
  @production_env %{
    "AWS_ENDPOINT_URL_S3" => "https://storage.example.test",
    "AWS_REGION" => "auto",
    "BUCKET_NAME" => "private-bucket",
    "PUBLIC_BUCKET_NAME" => "public-bucket",
    "PUBLIC_STORAGE_URL" => "https://cdn.example.test",
    "AWS_ACCESS_KEY_ID" => "test-access-key",
    "AWS_SECRET_ACCESS_KEY" => "test-secret-key",
    "DATABASE_URL" => "ecto://test:test@localhost/test",
    "SECRET_KEY_BASE" => String.duplicate("s", 64),
    "JWT_SECRET" => String.duplicate("j", 32),
    "RESEND_API_KEY" => "test-resend-key",
    "MAILER_ADAPTER" => "resend",
    "SMTP_USERNAME" => nil,
    "SMTP_PASSWORD" => nil,
    "SMTP_RELAY" => nil,
    "SMTP_PORT" => "587",
    "RAZORPAY_KEY_ID" => nil,
    "RAZORPAY_KEY_SECRET" => nil,
    "RAZORPAY_WEBHOOK_SECRET" => nil,
    "RAZORPAY_PLAN_ID" => nil,
    "BILLING_SEAT_PRICE_INR" => "499",
    "PORT" => "4000"
  }

  @required_names ~w(AWS_ENDPOINT_URL_S3 AWS_REGION BUCKET_NAME PUBLIC_BUCKET_NAME PUBLIC_STORAGE_URL
    AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY DATABASE_URL SECRET_KEY_BASE JWT_SECRET RESEND_API_KEY)

  test "production rejects missing and blank required values without exposing credentials" do
    for name <- @required_names, value <- [nil, "", "   "] do
      error = assert_raise RuntimeError, fn -> read_runtime(%{name => value}) end
      assert error.message =~ "#{name} is missing or blank"
      refute error.message =~ "test-secret-key"
    end
  end

  test "valid credentials are preserved rather than trimmed" do
    config = read_runtime(%{"JWT_SECRET" => "  a-valid-secret-value  "})
    assert config[:easy][:jwt_secret] == "  a-valid-secret-value  "
    assert config[:easy][Easy.Storage][:bucket] == "private-bucket"
    assert config[:easy][Easy.Mailer][:adapter] == Swoosh.Adapters.Resend
  end

  test "SMTP requires its relay but does not require a Resend key" do
    overrides = %{"MAILER_ADAPTER" => "smtp", "RESEND_API_KEY" => nil, "SMTP_PORT" => "587"}

    for relay <- [nil, "", "   "] do
      assert_raise RuntimeError, ~r/SMTP_RELAY is missing or blank/, fn ->
        read_runtime(Map.put(overrides, "SMTP_RELAY", relay))
      end
    end

    config = read_runtime(Map.put(overrides, "SMTP_RELAY", "smtp.example.test"))
    assert config[:easy][Easy.Mailer][:adapter] == Swoosh.Adapters.SMTP
  end

  test "unknown mail adapters fail instead of silently choosing Resend" do
    assert_raise RuntimeError, ~r/MAILER_ADAPTER must be resend or smtp/, fn ->
      read_runtime(%{"MAILER_ADAPTER" => "resned"})
    end
  end

  test "development and test configuration do not require production secrets" do
    missing = Map.new(@required_names, &{&1, nil})

    for environment <- [:dev, :test] do
      config = read_runtime(missing, environment)
      assert config[:easy][:jwt_secret] =~ "dev-secret-key"
    end
  end

  defp read_runtime(overrides, environment \\ :prod) do
    values = Map.merge(@production_env, overrides)
    previous = Map.new(values, fn {name, _value} -> {name, System.get_env(name)} end)

    try do
      put_env(values)
      Config.Reader.read!(@runtime_path, env: environment)
    after
      put_env(previous)
    end
  end

  defp put_env(values) do
    Enum.each(values, fn
      {name, nil} -> System.delete_env(name)
      {name, value} -> System.put_env(name, value)
    end)
  end
end
