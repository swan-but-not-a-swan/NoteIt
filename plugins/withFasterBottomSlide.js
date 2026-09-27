// Shortens the `slide_from_bottom` screen transition on Android — the one the
// enter-note screen opens and closes with.
//
// native-stack's `animationDuration` option only works on iOS. On Android,
// react-native-screens fixes this transition at the system's medium animation
// time (400ms) inside its own anim resources. An app resource with the same
// name wins over a library's when the APK is built, so this writes the three
// files the transition uses with a shorter duration. The third, the no-op
// "medium" animation, is the transition's other half and has to end at the
// same moment; nothing but slide_from_bottom uses it.
//
// Runs at prebuild, so it takes effect on the next native build (EAS, or
// `npx expo run:android`), not on a Metro reload. If react-native-screens ever
// renames these files, the override silently stops applying and the
// transition goes back to 400ms — nothing breaks.

const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const DURATION_MS = 300;

const ANDROID_NS = 'xmlns:android="http://schemas.android.com/apk/res/android"';

const FILES = {
  "rns_slide_in_from_bottom.xml": `<?xml version="1.0" encoding="utf-8"?>
<translate ${ANDROID_NS}
    android:fromYDelta="100%"
    android:toYDelta="0%"
    android:duration="${DURATION_MS}" />
`,
  "rns_slide_out_to_bottom.xml": `<?xml version="1.0" encoding="utf-8"?>
<translate ${ANDROID_NS}
    android:fromYDelta="0%"
    android:toYDelta="100%"
    android:duration="${DURATION_MS}" />
`,
  "rns_no_animation_medium.xml": `<?xml version="1.0" encoding="utf-8"?>
<alpha ${ANDROID_NS}
    android:fromAlpha="1.0"
    android:toAlpha="1.0"
    android:duration="${DURATION_MS}" />
`,
};

module.exports = function withFasterBottomSlide(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const animDir = path.join(modConfig.modRequest.platformProjectRoot, "app", "src", "main", "res", "anim");
      await fs.promises.mkdir(animDir, { recursive: true });
      for (const [name, xml] of Object.entries(FILES)) {
        await fs.promises.writeFile(path.join(animDir, name), xml);
      }
      return modConfig;
    },
  ]);
};
