#!/usr/bin/env bash
# Build the two downloads: dist/MSP-Tracker-mac.zip (Apple Silicon + Intel in one) and
# dist/MSP-Tracker-windows.zip.
# Runs on Linux (it's what the GitHub release workflow uses). Needs node 22, npm, go, curl, zip,
# python3 with Pillow (for the Mac icon). Usage: packaging/build-release.sh 1.0.0
#
# Each zip unpacks to one "MSP Tracker" folder: the launcher, the app, its own copy of Node, and (created on
# first run) a Data folder. Nothing is installed on the user's computer.
set -euo pipefail

VERSION="${1:?version, e.g. 1.0.0}"
NODE_VERSION="22.23.3"           # bundled runtime; keep on the same major as mise.toml
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
CACHE="$HERE/.cache"
WORK="$HERE/.work"
DIST="$REPO/dist"
rm -rf "$WORK" "$DIST"; mkdir -p "$CACHE" "$WORK" "$DIST"

fetch() { [ -s "$CACHE/$1" ] || curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$1" -o "$CACHE/$1"; }

echo "→ Node $NODE_VERSION runtimes"
curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$CACHE/SHASUMS256-$NODE_VERSION.txt"
for f in "node-v$NODE_VERSION-darwin-arm64.tar.gz" "node-v$NODE_VERSION-darwin-x64.tar.gz" "node-v$NODE_VERSION-win-x64.zip"; do
  fetch "$f"
  (cd "$CACHE" && grep " $f\$" "SHASUMS256-$NODE_VERSION.txt" | sha256sum -c --quiet -)
done

echo "→ Building the app (in a scratch copy, so a running local copy is never touched)"
SRC="$WORK/src"; mkdir -p "$SRC"
(cd "$REPO" && git ls-files -z | xargs -0 cp --parents -t "$SRC")
(cd "$SRC" && npm ci --no-audit --no-fund --loglevel=error && npm run build >/dev/null)

echo "→ Runtime packages (no native build; drivers are fetched per platform below)"
APP="$WORK/app"; mkdir -p "$APP"
cp -r "$SRC/build" "$APP/build"
cp "$SRC/package.json" "$SRC/package-lock.json" "$APP/"
(cd "$APP" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error)
rm -f "$APP/package-lock.json"

driver() {  # platform arch → path of the better-sqlite3 driver built for it
  local d="$WORK/driver-$1-$2"; rm -rf "$d"; cp -r "$APP/node_modules/better-sqlite3" "$d"
  (cd "$d" && rm -rf build && "$APP/node_modules/.bin/prebuild-install" --platform="$1" --arch="$2" \
     --runtime=node --target="$NODE_VERSION" >/dev/null) || {
    # prebuild-install is only in the full install; fall back to the repo's copy.
    (cd "$d" && "$SRC/node_modules/.bin/prebuild-install" --platform="$1" --arch="$2" --runtime=node --target="$NODE_VERSION")
  }
  echo "$d/build/Release/better_sqlite3.node"
}
# The app's own copy carries no compiled driver; each launcher points Node at the right one.
rm -rf "$APP/node_modules/better-sqlite3/build"

echo "→ Mac"
M="$WORK/mac/MSP Tracker/MSP Tracker.app/Contents"
mkdir -p "$M/MacOS" "$M/Resources"
sed "s/__VERSION__/$VERSION/g" "$HERE/mac/Info.plist" > "$M/Info.plist"
cp "$HERE/mac/launcher" "$M/MacOS/launcher"; chmod +x "$M/MacOS/launcher"
python3 -c "from PIL import Image; Image.open('$REPO/static/icon-app.png').convert('RGBA').save('$M/Resources/icon.icns')"
cp -r "$APP" "$M/Resources/app"
for a in arm64 x64; do
  mkdir -p "$M/Resources/runtime/$a"
  tar -xzf "$CACHE/node-v$NODE_VERSION-darwin-$a.tar.gz" -C "$WORK" "node-v$NODE_VERSION-darwin-$a/bin/node"
  mv "$WORK/node-v$NODE_VERSION-darwin-$a/bin/node" "$M/Resources/runtime/$a/node"
  cp "$(driver darwin "$a")" "$M/Resources/runtime/$a/better_sqlite3.node"
done
cp "$HERE/FIRST-RUN.txt" "$WORK/mac/MSP Tracker/"
(cd "$WORK/mac" && zip -qry "$DIST/MSP-Tracker-mac.zip" "MSP Tracker")

echo "→ Windows"
W="$WORK/win/MSP Tracker"
mkdir -p "$W/app/runtime"
cp -r "$APP/." "$W/app/"
unzip -qj "$CACHE/node-v$NODE_VERSION-win-x64.zip" "node-v$NODE_VERSION-win-x64/node.exe" -d "$W/app/runtime"
cp "$(driver win32 x64)" "$W/app/runtime/better_sqlite3.node"
(cd "$HERE/windows" && rm -f ./*.syso \
  && go run github.com/tc-hib/go-winres@v0.3.3 simply --arch amd64 --icon "$SRC/static/icon-app.png" \
       --manifest gui --product-name "MSP Tracker" --file-description "MSP Tracker" --product-version "$VERSION" --file-version "$VERSION" \
  && GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H windowsgui -s -w" -o "$W/MSP Tracker.exe" . \
  && rm -f ./*.syso)
cp "$HERE/FIRST-RUN.txt" "$W/"
(cd "$WORK/win" && zip -qr "$DIST/MSP-Tracker-windows.zip" "MSP Tracker")

ls -lh "$DIST"
