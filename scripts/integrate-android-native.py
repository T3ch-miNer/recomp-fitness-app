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
native=base/'java'/'com'/'recomp'/'health'
native.mkdir(parents=True,exist_ok=True)
for f in ('RecompHealthPlugin.kt','RecompWellbeingPlugin.kt'):
    shutil.copy2(root/'android-health-connect'/f,native/f)

# Kotlin 2.3 + Capacitor v8 Android Gradle 8.13/Gradle 8.14.3.
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
    implementation 'androidx.health.connect:connect-client:1.1.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2'
}
"""
app_gradle.write_text(content)

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
xml=xml.replace('</application>',activities+'    </application>',1)
manifest.write_text(xml)
print('Integrated RecompHealth and RecompWellbeing with opt-in Android permissions.')
