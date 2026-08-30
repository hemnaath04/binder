#!/bin/sh
# Deploy each app as its own Netlify site, which means its own origin.
#
# Run `netlify login` once first. Site names are fixed so the origins declared
# in apps/binder/origins.js and each portal's tools.js stay correct; if a name
# is taken, change it in BOTH places or federation will silently read nothing.
#
#   ./deploy.sh            deploy previews
#   ./deploy.sh prod       deploy to production

set -e
cd "$(dirname "$0")"

PROD_FLAG=""
[ "$1" = "prod" ] && PROD_FLAG="--prod"

deploy() {
	dir="$1"; site="$2"
	echo
	echo "=== $site  ($dir) ==="
	netlify deploy --dir "apps/$dir" --site "$site" $PROD_FLAG --no-build
}

deploy northfield   northfield-cardiology
deploy stalbans     stalbans-kidney
deploy wellspring   wellspring-rx
deploy corbinvalley corbinvalley-discharge
deploy binder       binder-care

echo
echo "Deployed. Verify WebMCP is alive on each origin:"
echo "  curl -sI https://binder-care.netlify.app | grep -i origin-agent-cluster"
