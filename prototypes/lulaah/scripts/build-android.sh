#!/usr/bin/env bash
set -euo pipefail

: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK directory}"
tools="$ANDROID_HOME/build-tools/34.0.0"
android_jar="$ANDROID_HOME/platforms/android-34/android.jar"
intermediates=build/android
mkdir -p "$intermediates"/{assets,classes,dex}
cp dist/Lulaah.html "$intermediates/assets/index.html"

if [[ -n "${LULAAH_ECJ_JAR:-}" ]]; then
  java -jar "$LULAAH_ECJ_JAR" -proc:none -source 8 -target 8 -cp "$android_jar" \
    -d "$intermediates/classes" android/MainActivity.java
else
  javac --release 8 -cp "$android_jar" -d "$intermediates/classes" android/MainActivity.java
fi

"$tools/d8" --min-api 26 --lib "$android_jar" --output "$intermediates/dex" \
  "$intermediates"/classes/studio/lulaah/crochet/*.class
"$tools/aapt" package -f -M android/AndroidManifest.xml -I "$android_jar" \
  -A "$intermediates/assets" -F "$intermediates/raw.apk"
(cd "$intermediates/dex" && zip -q ../raw.apk classes.dex)
"$tools/zipalign" -f -p 4 "$intermediates/raw.apk" "$intermediates/aligned.apk"
if [[ ! -f "$intermediates/local-preview.p12" ]]; then
  keytool -genkeypair -noprompt -alias preview -keyalg RSA -keysize 2048 \
    -validity 365 -storetype PKCS12 -keystore "$intermediates/local-preview.p12" \
    -storepass android -dname "CN=Lulaah Local Preview"
fi
"$tools/apksigner" sign --ks "$intermediates/local-preview.p12" --ks-pass pass:android \
  --v4-signing-enabled false --out dist/Lulaah.apk "$intermediates/aligned.apk"
"$tools/apksigner" verify --verbose dist/Lulaah.apk
