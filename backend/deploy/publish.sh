#!/usr/bin/env bash
# Build + publish the API and Worker into /var/www/school-events.
# Run on the Ubuntu server from the repo root (the folder containing SchoolEvents.sln),
# after the .NET 8 SDK is installed.
#
#   sudo bash deploy/publish.sh
#
set -euo pipefail

DEST="${DEST:-/var/www/school-events}"
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
echo "  1) Edit the two systemd units in deploy/ (DB password + JWT secret), then:"
echo "       sudo cp deploy/schoolevents-*.service /etc/systemd/system/"
echo "       sudo systemctl daemon-reload"
echo "       sudo systemctl enable --now schoolevents-api schoolevents-worker"
echo "  2) In aaPanel, point your site's reverse proxy at http://127.0.0.1:5080"
