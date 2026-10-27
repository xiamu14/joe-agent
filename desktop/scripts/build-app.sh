#!/bin/zsh
set -eu
cd "${0:A:h}/.."
swift build --configuration release "$@"
app="$PWD/build/Joe.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp .build/release/Joe "$app/Contents/MacOS/Joe"
cp -R .build/release/Desktop_Desktop.bundle "$app/Contents/Resources/"
cp Info.plist "$app/Contents/Info.plist"
codesign --force --sign - "$app"
echo "$app"
