defmodule EasyWeb.WorkbenchOpenApiTest do
  use ExUnit.Case, async: true

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormSubmissionRequest,
    ClientProfileFormTemplateRequest,
    ClientProfileServiceTypeAnswer,
    MarkHandledRequest
  }

  test "publishes explicit Workbench paths and removes the overloaded list parameters" do
    spec = EasyWeb.ApiSpec.spec()

    for queue <- ~w(onboarding programming expiring quiet check-ins replies) do
      assert spec.paths["/v1/coach/workbench/queues/#{queue}"].get
    end

    assert spec.paths["/v1/coach/conversations/{id}/mark-handled"].post
    assert spec.paths["/v1/coach/form-assignments/{id}/remind"].post

    client_parameters = spec.paths["/v1/coach/clients"].get.parameters
    conversation_parameters = spec.paths["/v1/coach/conversations"].get.parameters

    refute Enum.any?(client_parameters, &(&1.name == :filter))
    refute Enum.any?(conversation_parameters, &(&1.name == :waiting))
  end

  test "canonical Client exposes required facts but no queue projections" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()
    client = spec.components.schemas["Client"]

    assert Map.has_key?(client.properties, :joined_at)
    assert Map.has_key?(client.properties, :required_services)
    assert :joined_at in client.required
    assert :required_services in client.required

    for retired <- [:intake_incomplete, :needs_plan, :needs_programming, :covered_until] do
      refute Map.has_key?(client.properties, retired)
      refute retired in client.required
    end

    assert Map.has_key?(client.properties, :expiring_soon)
  end

  test "publishes queue filters, nullable lifecycle clocks, and drain actions precisely" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()

    programming = spec.paths["/v1/coach/workbench/queues/programming"].get
    service = Enum.find(programming.parameters, &(&1.name == :service))
    assert service.schema.enum == ["all", "training", "nutrition"]
    assert service.schema.default == "all"

    client = spec.components.schemas["Client"]
    assert client.properties.joined_at.type == :string
    assert client.properties.joined_at.format == :"date-time"
    assert client.properties.joined_at.nullable
    assert :joined_at in client.required

    conversation = spec.components.schemas["Conversation"]
    assert conversation.properties.waiting_since.type == :string
    assert conversation.properties.waiting_since.format == :"date-time"
    assert conversation.properties.waiting_since.nullable
    assert :waiting_since in conversation.required

    mark_handled = spec.components.schemas[MarkHandledRequest.schema().title]

    assert {:ok, _} =
             OpenApiSpex.cast_value(
               %{"expected_last_message_at" => "2026-08-14T10:30:00.123456Z"},
               mark_handled,
               spec
             )

    for invalid <- [
          %{},
          %{"expected_last_message_at" => "not-a-timestamp"},
          %{"expected_last_message_at" => "2026-08-14T10:30:00Z", "extra" => true}
        ] do
      assert {:error, _} = OpenApiSpex.cast_value(invalid, mark_handled, spec)
    end

    mark_handled_operation = spec.paths["/v1/coach/conversations/{id}/mark-handled"].post
    assert mark_handled_operation.requestBody.required
    assert Map.has_key?(mark_handled_operation.responses, 204)
    assert Map.has_key?(mark_handled_operation.responses, 409)

    reminder = spec.paths["/v1/coach/form-assignments/{id}/remind"].post
    assert reminder.requestBody == nil
    assert Map.has_key?(reminder.responses, 204)
  end

  test "service_type templates and answers are closed by the OpenAPI contract" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()
    template = spec.components.schemas[ClientProfileFormTemplateRequest.schema().title]
    submission = spec.components.schemas[ClientProfileFormSubmissionRequest.schema().title]
    service_answer = spec.components.schemas[ClientProfileServiceTypeAnswer.schema().title]

    service_question = %{
      "id" => "services",
      "label" => "What coaching do you need?",
      "type" => "service_type",
      "required" => true
    }

    assert {:ok, _} =
             OpenApiSpex.cast_value(
               %{"name" => "Intake", "purpose" => "intake", "sections" => [%{"questions" => [service_question]}]},
               template,
               spec
             )

    assert {:error, _} =
             OpenApiSpex.cast_value(
               %{
                 "name" => "Intake",
                 "purpose" => "intake",
                 "sections" => [
                   %{"questions" => [Map.put(service_question, "options", ["training"])]}
                 ]
               },
               template,
               spec
             )

    assert {:ok, _} =
             OpenApiSpex.cast_value(
               %{
                 "answers" => %{
                   "service-type" => %{"services" => ["training", "nutrition"]}
                 }
               },
               submission,
               spec
             )

    for invalid <- [
          %{"services" => []},
          %{"services" => ["nutrition", "training"]},
          %{"services" => ["physio"]},
          %{"services" => ["training"], "extra" => true}
        ] do
      assert {:error, _} = OpenApiSpex.cast_value(invalid, service_answer, spec)

      assert {:error, _} =
               OpenApiSpex.cast_value(
                 %{"answers" => %{"service-type" => invalid}},
                 submission,
                 spec
               )
    end
  end
end
