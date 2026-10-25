#!/usr/bin/env bash
# Runs ONLY against the disposable PostgreSQL container ID from GitHub Actions.
# Synthetic identities and a 49-product Pro account; never contacts Supabase.
set -Eeuo pipefail
container="${1:?ephemeral PostgreSQL container ID required}"
outdir="$(mktemp -d)"
trap 'rm -rf "$outdir"' EXIT

call_create() {
  docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d pf_v2_isolated_qa \
    -c "SET ROLE service_role; SELECT public.pf_v2_create_product_trusted('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Simultáneo','food',1);"
}

call_create >"$outdir/a.log" 2>&1 &
pid_a=$!
call_create >"$outdir/b.log" 2>&1 &
pid_b=$!

status_a=0
status_b=0
wait "$pid_a" || status_a=$?
wait "$pid_b" || status_b=$?

successes=0
if [[ "$status_a" -eq 0 ]]; then successes=$((successes+1)); fi
if [[ "$status_b" -eq 0 ]]; then successes=$((successes+1)); fi
if [[ "$successes" -ne 1 ]]; then
  echo "FAIL: expected exactly one successful product insert; got $successes" >&2
  cat "$outdir/a.log" "$outdir/b.log" >&2
  exit 1
fi
if [[ "$status_a" -ne 0 ]]; then
  grep -q 'PRODUCT_QUOTA' "$outdir/a.log" || { cat "$outdir/a.log" >&2; exit 1; }
else
  grep -q 'PRODUCT_QUOTA' "$outdir/b.log" || { cat "$outdir/b.log" >&2; exit 1; }
fi

count="$(docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d pf_v2_isolated_qa -At \
  -c "SELECT count(*) FROM public.pf_v2_products WHERE owner_uid='11111111-1111-4111-8111-111111111111';")"
if [[ "$count" != "50" ]]; then
  echo "FAIL: expected exactly 50 products after concurrent create, got $count" >&2
  exit 1
fi
echo "PASS: two simultaneous service writes => one insert, one PRODUCT_QUOTA; exactly 50 products"
