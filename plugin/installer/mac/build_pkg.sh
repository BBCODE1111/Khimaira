#!/usr/bin/env bash
# Builds "KHIMAIRA-<version>-mac.pkg" from the JUCE build output.
#   installer/mac/build_pkg.sh <version> <artefacts dir (…/Khimaira_artefacts/Release)> <output dir>
# Optional env: MACOS_DEV_ID_INSTALLER="Developer ID Installer: Name (TEAMID)" to sign the package.
set -euo pipefail

VERSION="$1"
ART="$2"
OUT="$3"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
mkdir -p "$OUT"

make_component () { # id  bundle  install-dir  [scripts-dir]
  local id="$1" bundle="$2" dest="$3" scripts="${4:-}"
  local root="$WORK/root-$id"
  mkdir -p "$root$dest"
  ditto "$bundle" "$root$dest/$(basename "$bundle")"

  # Plug-ins must land exactly where we put them, never "relocated" to an old copy.
  pkgbuild --analyze --root "$root" "$WORK/$id.plist"
  /usr/libexec/PlistBuddy -c "Set :0:BundleIsRelocatable false" "$WORK/$id.plist" || true

  local args=(--root "$root" --component-plist "$WORK/$id.plist" --identifier "com.khimaira.plugin.$id"
              --version "$VERSION" --install-location "/")
  [[ -n "$scripts" ]] && args+=(--scripts "$scripts")
  pkgbuild "${args[@]}" "$WORK/khimaira-$id.pkg"
}

make_component vst3 "$ART/VST3/KHIMAIRA.vst3" "/Library/Audio/Plug-Ins/VST3"
make_component au   "$ART/AU/KHIMAIRA.component" "/Library/Audio/Plug-Ins/Components" "$HERE/scripts-au"
make_component app  "$ART/Standalone/KHIMAIRA.app" "/Applications"

sed "s/__VERSION__/$VERSION/g" "$HERE/distribution.xml" > "$WORK/distribution.xml"

PRODUCT_ARGS=(--distribution "$WORK/distribution.xml" --package-path "$WORK" --resources "$HERE/resources")
if [[ -n "${MACOS_DEV_ID_INSTALLER:-}" ]]; then
  PRODUCT_ARGS+=(--sign "$MACOS_DEV_ID_INSTALLER")
fi

productbuild "${PRODUCT_ARGS[@]}" "$OUT/KHIMAIRA-$VERSION-mac.pkg"
rm -rf "$WORK"
echo "Built $OUT/KHIMAIRA-$VERSION-mac.pkg"
