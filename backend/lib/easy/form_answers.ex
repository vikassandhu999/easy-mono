defmodule Easy.FormAnswers do
  @type parse_error :: :invalid_answers | :answers_required
  @type validation_error :: :unknown_answer_keys | :missing_required_answers | :invalid_answer_values

  @spec from_attrs(map()) :: {:ok, map()} | {:error, parse_error()}
  def from_attrs(%{answers: answers}) when is_map(answers), do: {:ok, answers}
  def from_attrs(%{answers: _answers}), do: {:error, :invalid_answers}
  def from_attrs(_attrs), do: {:error, :answers_required}

  @spec validate([map()], map()) ::
          :ok | {:error, validation_error()}
  def validate(sections, answers) when is_list(sections) and is_map(answers) do
    questions = questions(sections)
    known_ids = MapSet.new(questions, & &1["id"])

    cond do
      Enum.any?(Map.keys(answers), &(not MapSet.member?(known_ids, &1))) ->
        {:error, :unknown_answer_keys}

      Enum.any?(questions, &missing_required?(&1, answers)) ->
        {:error, :missing_required_answers}

      Enum.any?(questions, &invalid_value?(&1, answers)) ->
        {:error, :invalid_answer_values}

      true ->
        :ok
    end
  end

  @spec required_services([map()], map()) :: [:training | :nutrition] | nil
  def required_services(sections, answers) do
    question_id =
      sections
      |> questions_of_type("service_type")
      |> Enum.find_value(& &1["id"])

    case Map.get(answers, question_id) do
      %{"services" => services} -> Enum.map(services, &service_atom/1)
      %{services: services} -> Enum.map(services, &service_atom/1)
      _answer -> nil
    end
  end

  @spec weight_values([map()], map()) :: [number()]
  def weight_values(sections, answers) do
    for %{"id" => id} <- questions_of_type(sections, "weight"),
        value = Map.get(answers, id),
        not is_nil(value),
        do: value
  end

  @spec photo_attachment_ids([map()], map()) :: [Ecto.UUID.t()]
  def photo_attachment_ids(sections, answers) do
    for %{"id" => id} <- questions_of_type(sections, "photo"),
        attachment_ids when is_list(attachment_ids) <- [Map.get(answers, id, [])],
        attachment_id <- attachment_ids,
        {:ok, attachment_id} <- [Ecto.UUID.cast(attachment_id)],
        do: attachment_id
  end

  defp questions_of_type(sections, type) do
    sections |> questions() |> Enum.filter(&(&1["type"] == type))
  end

  defp questions(sections) do
    for %{"questions" => questions} <- List.wrap(sections),
        is_list(questions),
        %{"id" => id} = question <- questions,
        is_binary(id),
        do: question
  end

  defp service_atom("training"), do: :training
  defp service_atom("nutrition"), do: :nutrition

  defp missing_required?(%{"required" => true, "id" => id}, answers),
    do: blank_answer?(Map.get(answers, id))

  defp missing_required?(%{"type" => "service_type", "id" => id}, answers),
    do: blank_answer?(Map.get(answers, id))

  defp missing_required?(_question, _answers), do: false

  defp blank_answer?(value), do: value in [nil, "", []]

  defp invalid_value?(%{"id" => id} = question, answers) do
    value = Map.get(answers, id)
    not blank_answer?(value) and not valid_value?(question["type"], value, question)
  end

  defp valid_value?("text", value, _question), do: is_binary(value)
  defp valid_value?("number", value, _question), do: is_number(value)
  defp valid_value?("boolean", value, _question), do: is_boolean(value)

  defp valid_value?("date", value, _question),
    do: is_binary(value) and match?({:ok, _date}, Date.from_iso8601(value))

  defp valid_value?("select", value, question),
    do: is_binary(value) and value in question_options(question)

  defp valid_value?("multi_select", value, question) do
    options = question_options(question)
    is_list(value) and value != [] and Enum.all?(value, &(is_binary(&1) and &1 in options))
  end

  defp valid_value?("rating", value, _question), do: is_integer(value) and value in 1..5

  defp valid_value?("weight", value, _question),
    do: is_number(value) and value > 0 and value < 1000

  defp valid_value?("photo", value, _question) do
    is_list(value) and value != [] and length(value) <= 4 and length(Enum.uniq(value)) == length(value) and
      Enum.all?(value, &valid_uuid?/1)
  end

  defp valid_value?("service_type", %{"services" => services} = value, _question),
    do: map_size(value) == 1 and services in [["training"], ["nutrition"], ["training", "nutrition"]]

  defp valid_value?("service_type", %{services: services} = value, _question),
    do: map_size(value) == 1 and services in [["training"], ["nutrition"], ["training", "nutrition"]]

  defp valid_value?("service_type", _value, _question), do: false

  defp valid_value?(_type, _value, _question), do: false

  defp question_options(%{"options" => options}) when is_list(options), do: options
  defp question_options(_question), do: []

  defp valid_uuid?(value) when is_binary(value), do: match?({:ok, _uuid}, Ecto.UUID.cast(value))
  defp valid_uuid?(_value), do: false
end
