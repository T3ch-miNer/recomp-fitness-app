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
if '<manifest ' not in xml and '<manifest>' not in xml:
    raise SystemExit('Unexpected Android manifest')
if 'xmlns:tools' not in xml:
    xml=xml.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ',1)
permissions='''
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    <!-- Android Special App Access; must be enabled in system settings by user. -->
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
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

# Clerk's native OAuth callback belongs to the app Activity, not the WebView.
if 'android:name=".RecompClerkApplication"' not in xml:
    xml=xml.replace('<application', '<application android:name=".RecompClerkApplication"',1)
import re
match=re.search(r'<activity\s+[^>]*android:name="\.MainActivity"',xml)
if not match: raise SystemExit('Unable to locate Capacitor MainActivity')
activity_end=xml.find('</activity>',match.start())
if activity_end<0: raise SystemExit('MainActivity closing tag missing')
callback='''
            <intent-filter>
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT"/>
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="clerk" android:host="com.t3chminer.recomp.callback"/>
            </intent-filter>
'''
xml=xml[:activity_end]+callback+xml[activity_end:]
xml=xml.replace('</application>',activities+'    </application>',1)
manifest.write_text(xml)
print('Integrated RecompHealth and RecompWellbeing with opt-in Android permissions.')
