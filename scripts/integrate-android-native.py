#!/usr/bin/env python3
"""Integrate Recomp's read-only Kotlin plugins into fresh Capacitor Android output.

This is run during CI after 'npx cap add android' and 'npx cap sync android'.
Capacitor's generated Android project remains ephemeral: no keystores or SDK
folders are committed to the public repository.
"""
from pathlib import Path
import shutil

root=Path(__file__).resolve().parent.parent
android=root/'android'
app=android/'app'
if not (app/'build.gradle').is_file():
    raise SystemExit('Capacitor Android project not generated')
base=(app/'src'/'main')

# Native bridge registration has same package as appId in capacitor.config.json.
main=base/'java'/'com'/'t3chminer'/'recomp'
main.mkdir(parents=True,exist_ok=True)
shutil.copy2(root/'android-src'/'MainActivity.java',main/'MainActivity.java')
shutil.copy2(root/'android-src'/'PermissionsRationaleActivity.java',main/'PermissionsRationaleActivity.java')
shutil.copy2(root/'android-src'/'RecompClerkApplication.kt',main/'RecompClerkApplication.kt')
native=base/'java'/'com'/'recomp'/'health'
native.mkdir(parents=True,exist_ok=True)
for f in ('RecompHealthPlugin.kt','RecompWellbeingPlugin.kt','RecompAuthPlugin.kt'):
    shutil.copy2(root/'android-health-connect'/f,native/f)

# Kotlin 2.3 + Capacitor v8 Android Gradle 8.13/Gradle 8.14.3.
# Health Connect is supported only on newer Android devices; target Android 9+.
variables=android/'variables.gradle'
variables_txt=variables.read_text()
if 'minSdkVersion = 24' not in variables_txt:
    raise SystemExit('Expected Capacitor minSdkVersion not found')
variables.write_text(variables_txt.replace('minSdkVersion = 24','minSdkVersion = 28',1))

root_gradle=android/'build.gradle'
content=root_gradle.read_text()
needle="classpath 'com.android.tools.build:gradle:8.13.0'"
if needle not in content:
    raise SystemExit('Unexpected Capacitor version: AGP classpath not found')
content=content.replace(needle,needle+"\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.0'",1)
root_gradle.write_text(content)

app_gradle=app/'build.gradle'
content=app_gradle.read_text()
needle="apply plugin: 'com.android.application'"
if needle not in content:
    raise SystemExit('Unexpected Capacitor app build.gradle format')
content=content.replace(needle,needle+"\napply plugin: 'org.jetbrains.kotlin.android'",1)
content += """
// Read-only Health Connect activity sync and Kotlin coroutine support.
dependencies {
    implementation 'com.clerk:clerk-android-api:1.1.6'
    implementation 'androidx.health.connect:connect-client:1.1.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2'
}
"""
# Keep debug builds independent of the originally installed Recomp package.
# GitHub-hosted debug builds use ephemeral signing keys, so Android will reject
# an in-place update signed by another runner. A distinct beta application ID
# protects the existing installation and all its local records.
content += """
android {
    buildTypes {
        debug {
            applicationIdSuffix ".beta"
        }
    }
}
"""
app_gradle.write_text(content)

# Make the beta build recognisable alongside the existing production/test app.
strings=base/'res'/'values'/'strings.xml'
if strings.exists():
    strings_text=strings.read_text()
    strings_text=strings_text.replace('>Recomp</string>', '>Recomp Beta</string>')
    strings.write_text(strings_text)


manifest=base/'AndroidManifest.xml'
xml=manifest.read_text()
# Clerk must be initialised before any native plugin call. Copying the Kotlin
# class alone does not cause Android to execute its Application.onCreate().
import re
application=re.search(r'<application\b[^>]*>', xml)
if not application:
    raise SystemExit('Android application element not found')
application_tag=application.group(0)
if re.search(r'\bandroid:name=', application_tag):
    application_tag=re.sub(r'android:name="[^"]+"', 'android:name=".RecompClerkApplication"', application_tag, count=1)
else:
    application_tag=application_tag[:-1]+' android:name=".RecompClerkApplication">'
xml=xml[:application.start()]+application_tag+xml[application.end():]
if '<manifest ' not in xml and '<manifest>' not in xml:
    raise SystemExit('Unexpected Android manifest')
if 'xmlns:tools' not in xml:
    xml=xml.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ',1)
permissions='''
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    <!-- Android Special App Access; must be enabled in system settings by user. -->
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
    <!-- Reminders: lets a workout alarm fire on time once the user allows it in settings. -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <queries><package android:name="com.google.android.apps.healthdata" /></queries>
'''
pos=xml.find('>',xml.index('<manifest'))+1
xml=xml[:pos]+permissions+xml[pos:]
activities='''
        <!-- Health Connect permission rationale; no sensitive data transmitted. -->
        <activity android:name=".PermissionsRationaleActivity" android:exported="true">
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>
        <activity-alias android:name=".ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity=".PermissionsRationaleActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>
'''
if '</application>' not in xml:
    raise SystemExit('Application closing tag missing')

# Clerk Android registers the unique default callback for each installed package,
# for example clerk://com.t3chminer.recomp.beta.callback for debug builds.
# Do NOT add the old shared com.t3chminer.recomp.callback intent filter here.
# A shared filter makes Android offer both Recomp and Recomp Beta in its chooser.
xml=xml.replace('</application>',activities+'    </application>',1)
manifest.write_text(xml)

# Status-bar icon for reminders: a white pulse line, drawn as a vector.
drawable=base/'res'/'drawable'
drawable.mkdir(parents=True,exist_ok=True)
(drawable/'ic_stat_recomp.xml').write_text("""<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2.2"
        android:strokeLineCap="round" android:strokeLineJoin="round"
        android:pathData="M2.5,13h4l2.5,-6 4,11 3,-8 2,3h3.5"/>
</vector>
""")
# Launcher icon and launch images in the Recomp brand (v3.12). Capacitor's
# template ships its own logo, so every file it creates is replaced here.
import shutil
res=base/'res'
icons=root/'android-icons'
for density in ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']:
    for name in ['ic_launcher','ic_launcher_round','ic_launcher_foreground','ic_launcher_background']:
        target=res/f'mipmap-{density}'
        target.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(icons/f'mipmap-{density}'/f'{name}.png',target/f'{name}.png')
for folder in (icons/'splash').iterdir():
    (res/folder.name).mkdir(parents=True,exist_ok=True)
    shutil.copyfile(folder/'splash.png',res/folder.name/'splash.png')
# The template's vector foreground and white background are no longer used.
for stale in [res/'drawable-v24'/'ic_launcher_foreground.xml',res/'drawable'/'ic_launcher_background.xml']:
    if stale.exists():stale.unlink()
(res/'values'/'ic_launcher_background.xml').write_text("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#01010D</color>
</resources>
""")
adaptive="""<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
"""
(res/'mipmap-anydpi-v26').mkdir(parents=True,exist_ok=True)
for name in ['ic_launcher.xml','ic_launcher_round.xml']:(res/'mipmap-anydpi-v26'/name).write_text(adaptive)
# Android 13 themed icons: the pulse in one colour, inside the 66 dp safe zone.
(res/'drawable'/'ic_launcher_monochrome.xml').write_text("""<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="432" android:viewportHeight="432">
    <group android:translateX="23.6" android:translateY="53.2" android:scaleX="1.85" android:scaleY="1.85">
        <path android:strokeColor="#FFFFFFFF" android:strokeWidth="12" android:fillColor="#00000000"
            android:strokeLineCap="round" android:strokeLineJoin="round"
            android:pathData="M42,104h24l16,-38 24,60 18,-42 14,20h22"/>
        <path android:fillColor="#FFFFFFFF" android:pathData="M148,58m-9,0a9,9 0,1 1,18 0a9,9 0,1 1,-18 0"/>
    </group>
</vector>
""")
# Android 12+ system splash: Onyx behind the icon instead of white.
styles=res/'values'/'styles.xml'
styles_xml=styles.read_text()
if 'windowSplashScreenBackground' not in styles_xml:
    styles_xml=styles_xml.replace('<item name="android:background">@drawable/splash</item>','<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>',1)
    styles.write_text(styles_xml)

print('Integrated RecompHealth and RecompWellbeing with opt-in Android permissions, the reminder icon, and the Recomp launcher icon and launch images.')
