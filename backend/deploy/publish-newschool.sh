#!/usr/bin/env bash
# Build + publish the API and Worker into /var/www/newschool (Option B: second site).
# Run on the Ubuntu server from the repo root (the folder containing SchoolEvents.sln),
# after the .NET 8 SDK is installed.
#
#   sudo bash deploy/publish-newschool.sh
#
set -euo pipefail

DEST="${DEST:-/var/www/newschool}"
CONFIG="${CONFIG:-Release}"
RUN_USER="${RUN_USER:-www-data}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

echo "==> Ensuring $DEST exists"
mkdir -p "$DEST/api" "$DEST/worker"

echo "==> Publishing API   -> $DEST/api"
dotnet publish src/SchoolEvents.Api/SchoolEvents.Api.csproj \
  -c "$CONFIG" -o "$DEST/api" --nologo

echo "==> Publishing Worker -> $DEST/worker"
dotnet publish src/SchoolEvents.Worker/SchoolEvents.Worker.csproj \
  -c "$CONFIG" -o "$DEST/worker" --nologo

echo "==> Fixing ownership ($RUN_USER)"
chown -R "$RUN_USER:$RUN_USER" "$DEST"

echo
echo "Done. Published to $DEST"
echo "Next:"
echo "  1) Install the units (already point at $DEST, port 5090):"
echo "       sudo cp deploy/newschool-api.service deploy/newschool-worker.service /etc/systemd/system/"
echo "     Edit the DB password + Jwt__Secret in newschool-api.service, then:"
echo "       sudo systemctl daemon-reload"
echo "       sudo systemctl enable --now newschool-api newschool-worker"
echo "  2) In aaPanel, point the new site's reverse proxy at http://127.0.0.1:5090"
