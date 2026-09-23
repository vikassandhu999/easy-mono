if Mix.env() != :dev, do: raise("Exercise browser fixtures require MIX_ENV=dev")

Application.put_env(:easy, Easy.Repo, Keyword.put(Application.get_env(:easy, Easy.Repo), :database, System.get_env("EASY_BROWSER_DATABASE", "easy_browser_dev")))

{:ok, _} = Application.ensure_all_started(:ecto_sql)
{:ok, _} = Easy.Repo.start_link()

for {schema, names} <- [
      {Easy.Training.TrainingEquipment, ["Dumbbells", "Bench"]},
      {Easy.Training.TrainingMuscle, ["Quadriceps", "Hamstrings"]}
    ],
    name <- names do
  unless Easy.Repo.get_by(schema, name: name) do
    Easy.Repo.insert!(struct(schema, name: name))
  end
end
