#!/bin/sh
# Serve each app on its own port, which means its own origin. WebMCP requires a
# secure context and localhost qualifies, so cross-origin federation is testable
# locally with no deploy.
#
#   :8091  Northfield Cardiology
#   :8092  St. Albans Kidney Care
#   :8093  Wellspring Pharmacy
#   :8094  Corbin Valley Hospital
#   :8090  Binder host (added on day 4)
#
# Ctrl-C stops everything.

set -e
cd "$(dirname "$0")/apps"

serve() {
	(cd "$1" && python3 -m http.server "$2" --bind 127.0.0.1 >/dev/null 2>&1) &
	echo "  $3  http://localhost:$2/"
}

echo "serving:"
serve northfield   8091 "Northfield Cardiology"
serve stalbans     8092 "St. Albans Kidney Care"
serve wellspring   8093 "Wellspring Pharmacy   "
serve corbinvalley 8094 "Corbin Valley Hospital"
[ -d binder ] && serve binder 8090 "Binder host           "

trap 'kill $(jobs -p) 2>/dev/null' EXIT INT TERM
echo
wait
