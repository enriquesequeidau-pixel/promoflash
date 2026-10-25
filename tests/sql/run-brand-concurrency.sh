#!/usr/bin/env bash
# Only use ephemeral Docker PostgreSQL container from Actions, NEVER Supabase.
set -Eeuo pipefail
container="${1:?ephemeral PostgreSQL container ID is mandatory}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

create_brand() {
  docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d pf_v2_isolated_qa \
    -c "SET ROLE service_role; SELECT public.pf_v2_create_brand_trusted('22222222-2222-4222-8222-222222222222','Brand concurrente');"
}
create_brand >"$tmp/first.log" 2>&1 &
p1=$!
create_brand >"$tmp/second.log" 2>&1 &
p2=$!

a=0; b=0
wait "$p1" || a=$?
wait "$p2" || b=$?
if [[ "$a" -eq "$b" ]]; then
  echo "FAIL: expected one successful brand and one quota rejection" >&2
  cat "$tmp/first.log" "$tmp/second.log" >&2
  exit 1
fi
if [[ "$a" -ne 0 ]]; then
  grep -q 'BRAND_QUOTA' "$tmp/first.log" || {
    cat "$tmp/first.log" >&2; exit 1;
  }
else
  grep -q 'BRAND_QUOTA' "$tmp/second.log" || {
    cat "$tmp/second.log" >&2; exit 1;
  }
fi
count="$(docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d pf_v2_isolated_qa -At \
  -c "SELECT count(*) FROM public.pf_v2_brands WHERE owner_uid='22222222-2222-4222-8222-222222222222';")"
if [[ "$count" != "5" ]]; then
  echo "FAIL: expected exactly five Business brands, got $count" >&2
  exit 1
fi
echo "PASS: two concurrent brand writes => one success, one BRAND_QUOTA, exactly five"
