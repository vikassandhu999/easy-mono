defmodule Easy.LandingApplicationQuestions do
  import Ecto.Changeset

  @question_types %{id: :string, label: :string, type: Ecto.ParameterizedType.init(Ecto.Enum, values: [:short_text, :long_text, :single_select]), options: {:array, :string}}

  @spec validate_questions(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_questions(changeset) do
    case get_change(changeset, :application_questions) do
      nil -> changeset
      questions -> normalize_questions(changeset, questions)
    end
  end

  defp normalize_questions(changeset, questions) do
    with {:ok, normalized} <- Easy.Result.traverse(questions, &question/1),
         ids = Enum.map(normalized, &Map.fetch!(&1, "id")),
         true <- length(ids) == MapSet.size(MapSet.new(ids)) do
      put_change(changeset, :application_questions, normalized)
    else
      _ -> add_error(changeset, :application_questions, "each question needs a unique ID, a label and a valid answer type; choice questions need 2–20 distinct options")
    end
  end

  defp question(attrs) when is_map(attrs) do
    {%{options: []}, @question_types}
    |> cast(attrs, Map.keys(@question_types))
    |> validate_required([:id, :label, :type])
    |> validate_length(:id, max: 100)
    |> validate_format(:id, ~r/^[a-zA-Z0-9_-]+$/)
    |> validate_exclusion(:id, ["__proto__", "constructor", "prototype"])
    |> validate_length(:label, max: 255)
    |> validate_inclusion(:type, [:short_text, :long_text, :single_select])
    |> validate_options()
    |> apply_action(:insert)
    |> case do
      {:ok, question} ->
        normalized = Map.update!(question, :type, &Atom.to_string/1)
        {:ok, Map.new(normalized, fn {key, value} -> {Atom.to_string(key), value} end)}

      error ->
        error
    end
  end

  defp question(_attrs), do: {:error, :invalid_input}

  defp validate_options(changeset) do
    if get_field(changeset, :type) == :single_select do
      options = get_field(changeset, :options) || []

      if length(options) in 2..20 and Enum.all?(options, &valid_option?/1) and
           length(options) == MapSet.size(MapSet.new(options)) do
        changeset
      else
        add_error(changeset, :options, "are invalid")
      end
    else
      put_change(changeset, :options, [])
    end
  end

  defp valid_option?(value), do: String.trim(value) != "" and String.length(value) <= 255

  @spec validate_answers(Ecto.Changeset.t(), [map()]) :: Ecto.Changeset.t()
  def validate_answers(changeset, questions) do
    answers = get_field(changeset, :answers) || %{}
    questions_by_id = Map.new(questions, &{&1["id"], &1})

    if Enum.all?(answers, fn {id, answer} -> valid_answer?(questions_by_id[to_string(id)], answer) end) do
      changeset
    else
      add_error(changeset, :answers, "must match the questions and choices on this page")
    end
  end

  defp valid_answer?(%{"type" => "single_select", "options" => options}, answer),
    do: is_binary(answer) and (answer == "" or answer in options)

  defp valid_answer?(%{"type" => type}, answer) when type in ["short_text", "long_text"],
    do: is_binary(answer) and String.length(answer) <= 4000

  defp valid_answer?(_question, _answer), do: false
end
