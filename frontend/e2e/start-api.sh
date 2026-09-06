#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../backend"
export MIX_ENV=test EASY_E2E=true
unset PHX_SERVER
# test.exs pins this connection to easy_test_e2e, regardless of MIX_TEST_PARTITION.
rtk proxy mix ecto.drop --quiet
rtk proxy mix ecto.create --quiet
rtk proxy mix ecto.migrate --quiet
rtk proxy mix run test/e2e/seed.exs
export PHX_SERVER=true
exec rtk proxy mix phx.server
