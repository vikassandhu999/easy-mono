defmodule Easy.ProspectAnswers do
  alias Easy.Landing.Prospect

  @type row :: %{question_id: String.t(), label: String.t(), value: String.t() | nil}

  @spec rows(Prospect.t()) :: [row()]
  def rows(%Prospect{} = prospect) do
    answers = prospect.answers || %{}

    configured =
      Enum.flat_map(prospect.submitted_questions || [], fn
        %{"id" => id} = question when is_binary(id) and id != "" ->
          [%{question_id: id, label: label(question["label"]), value: text(answers[id])}]

        _question ->
          []
      end)

    known_ids = MapSet.new(configured, & &1.question_id)

    earlier =
      answers
      |> Enum.reject(fn {id, _value} -> MapSet.member?(known_ids, id) end)
      |> Enum.sort_by(fn {id, _value} -> id end)
      |> Enum.map(fn {id, value} -> %{question_id: id, label: "Earlier question (#{id})", value: text(value)} end)

    configured ++ earlier
  end

  defp label(value) when is_binary(value) and value != "", do: value
  defp label(_value), do: "Earlier question"

  defp text(nil), do: nil
  defp text(""), do: nil
  defp text(value) when is_binary(value), do: value

  defp text(value) do
    case Jason.encode(value) do
      {:ok, text} -> text
      {:error, _} -> "Answer unavailable"
    end
  end
end
