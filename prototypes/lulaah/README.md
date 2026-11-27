# Lulaah crochet prototype

Lulaah is a Hebrew, right-to-left prototype for writing crochet patterns and seeing each stitch in a 3D preview. It includes project and part editing, local saves, stitch counts, magic rings, straight rows, double-sided oval foundations, BLO and FLO shaping, and part assembly by stitch range or dragging.

This directory preserves the existing browser and Android WebView prototype as a reference for the planned Expo app. Crochet parsing and geometry can be tested independently of the viewer. Geometry is an approximation of yarn and fabric. The Android wrapper is a local preview build.

## Preview in a browser

From this directory, using Node.js 22 or later, run:

```sh
npm ci
npm run preview
```

Open [the local preview](http://127.0.0.1:3000/). Start with the sample lavender doll, edit any part, or select **הרכבה** to see the assembled model. To try an oval, use:

```text
R1: 8 sc, 3 sc in next stitch, 8 sc, 2 sc in last stitch
R2: 8 sc, 3 inc, 8 sc, 2 inc
R3: BLO 26 sc
```

Replace `BLO` with `FLO` to compare the direction of the bend. The editor fills in each row's stitch count on Enter or when it loses focus.

## Checks and Android preview

- Run `npm test` for stitch counts, oval geometry and loop transitions.
- While the preview runs, run `npm run test:browser` for mobile-sized browser smoke checks. Set `CHROMIUM_PATH` if Chromium is installed somewhere other than `/usr/bin/chromium`.
- For a local Android APK, set `ANDROID_HOME` and install Android SDK Platform 34, Build Tools 34.0.0, a JDK and `zip`. Run `npm run build:android` to produce the signed preview at `dist/Lulaah.apk`. The script creates a local signing key under the ignored `build/` directory. It supports Android API 26 or later.
