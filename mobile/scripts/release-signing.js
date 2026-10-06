// Run in CI after `expo prebuild`: signs release builds with your own key
// (instead of the shared debug key) when the signing secrets are set.
// The passwords are read from environment variables at build time, so they
// are never written into any file.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "android", "app", "build.gradle");
let gradle = fs.readFileSync(file, "utf8");

const release = `
        release {
            storeFile file(System.getenv("LIFEOS_KEYSTORE_FILE"))
            storePassword System.getenv("LIFEOS_KEYSTORE_PASSWORD")
            keyAlias System.getenv("LIFEOS_KEY_ALIAS")
            keyPassword System.getenv("LIFEOS_KEY_PASSWORD")
        }`;

if (!/signingConfigs\s*\{\s*\n\s*debug\s*\{/.test(gradle)) throw new Error("Unexpected build.gradle: signingConfigs block not found");
gradle = gradle.replace(/signingConfigs\s*\{/, (m) => m + release);

// Point the release build type at the new config.
const rel = gradle.indexOf("        release {", gradle.indexOf("buildTypes"));
if (rel < 0) throw new Error("Unexpected build.gradle: release build type not found");
const at = gradle.indexOf("signingConfig signingConfigs.debug", rel);
if (at < 0) throw new Error("Unexpected build.gradle: release signingConfig not found");
gradle = gradle.slice(0, at) + "signingConfig signingConfigs.release" + gradle.slice(at + "signingConfig signingConfigs.debug".length);

fs.writeFileSync(file, gradle);
console.log("Release builds will be signed with the LifeOS key.");
