#!/usr/bin/env bash
# Usage: run.sh <fixture> <previous_version> <tested_version> [pass|fail] [expected_error]
# Each run uses only easy_test and drops it on exit, including unexpected failures.
set -euo pipefail

if [[ $# -lt 3 || $# -gt 5 ]]; then
  printf '%s\n' 'Usage: run.sh <fixture> <previous_version> <tested_version> [pass|fail] [expected_error]' >&2
  exit 2
fi
fixture=$1 previous=$2 tested=$3 expect=${4:-pass} expected_error=${5:-}
if [[ "$expect" != pass && "$expect" != fail ]] || [[ "$expect" = fail && -z "$expected_error" ]]; then
  printf '%s\n' 'Fail mode requires its expected error text as argument 5.' >&2
  exit 2
fi

cd "$(rtk proxy dirname "$0")/../../../backend"
dir=../.scratch/workout/migration-check
migration_output=$(rtk proxy mktemp)

cleanup() {
  local run_status=$?
  trap - EXIT
  if ! rtk proxy env MIX_ENV=test mix ecto.drop --quiet; then
    run_status=1
  fi
  if ! rtk proxy rm -f "$migration_output"; then
    run_status=1
  fi
  exit "$run_status"
}
trap cleanup EXIT

db_url=$(rtk proxy env MIX_ENV=test mix run --no-start -e 'c=Application.get_env(:easy, Easy.Repo); IO.write("postgresql://#{c[:username]}:#{c[:password]}@#{c[:hostname]}:#{c[:port] || 5432}/#{c[:database]}")')

rtk proxy env MIX_ENV=test mix ecto.drop --quiet
rtk proxy env MIX_ENV=test mix ecto.create --quiet
rtk proxy env MIX_ENV=test mix ecto.migrate --quiet --to "$previous"
rtk proxy psql "$db_url" -q -v ON_ERROR_STOP=1 -f "$dir/$fixture.sql"

if [[ "$expect" = fail ]]; then
  if rtk proxy env MIX_ENV=test mix ecto.migrate --quiet --to "$tested" >"$migration_output" 2>&1; then
    rtk proxy cat "$migration_output"
    printf 'FAIL: %s migrated but should have stopped\n' "$fixture" >&2
    exit 1
  fi
  rtk proxy cat "$migration_output"
  if ! rtk proxy grep -Fq -- "$expected_error" "$migration_output"; then
    printf 'FAIL: %s stopped without the expected error: %s\n' "$fixture" "$expected_error" >&2
    exit 1
  fi
  printf 'PASS: %s stopped with the expected error\n' "$fixture"
else
  rtk proxy env MIX_ENV=test mix ecto.migrate --quiet --to "$tested"
  rtk proxy psql "$db_url" -q -v ON_ERROR_STOP=1 -f "$dir/$fixture-check.sql"
  printf 'PASS: %s\n' "$fixture"
fi
