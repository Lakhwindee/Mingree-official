import JSZip from 'jszip';

export async function generateAndroidApkProjectZip(appName: string = 'Mingree'): Promise<Blob> {
  const zip = new JSZip();

  // Root files
  zip.file('README-HOW-TO-BUILD-APK.md', `# ${appName} - Android APK Build Instructions

Aapka Android App Project taiyar hai! Is project se APK banane ke 3 aasan tareeqe hain:

---

## Tareeqa 1: Android Studio (Recommended - 2 Minutes)
1. Is zip file ko apne computer par extract karein.
2. **Android Studio** open karein aur **"Open"** par click karke \`android\` folder select karein.
3. Gradle sync complete hone ke baad, top menu mein:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)** par click karein.
4. Kuch hi seconds me aapka **\`app-debug.apk\`** generate ho jayega!
   Location: \`android/app/build/outputs/apk/debug/app-debug.apk\`
5. Is APK ko apne Android phone me transfer karke Install kar lijiye.

---

## Tareeqa 2: Terminal / Command Line
Agar aapke paas Java aur Android SDK installed hai:
\`\`\`bash
cd android
./gradlew assembleDebug
\`\`\`
APK output yahan milegi:
\`android/app/build/outputs/apk/debug/app-debug.apk\`

---

## Tareeqa 3: Free Cloud APK Builder (Bina computer/Android Studio ke)
1. **PWABuilder (by Microsoft)**:
   - Website: https://www.pwabuilder.com
   - Apna live app URL dalein
   - "Package for Android" par click karein aur direct **signed APK/AAB** download karein!

---

### App Configuration:
- **Package Name**: com.mingree.influencer
- **App Name**: ${appName}
- **Target Android Version**: Android 14 (API 34)
- **Minimum Android Version**: Android 8.0 (API 26)
- **Permissions**: Internet, Network State, Camera (optional proof upload), Storage
`);

  // Capacitor config
  zip.file('capacitor.config.json', JSON.stringify({
    appId: 'com.mingree.influencer',
    appName: appName,
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
      androidScheme: 'https',
      cleartext: true
    },
    android: {
      allowMixedContent: true,
      captureInput: true,
      webContentsDebuggingEnabled: true
    }
  }, null, 2));

  // Package.json for project
  zip.file('package.json', JSON.stringify({
    name: 'mingree-android-app',
    version: '1.0.0',
    private: true,
    dependencies: {
      '@capacitor/android': '^6.0.0',
      '@capacitor/core': '^6.0.0'
    },
    scripts: {
      'build:android': 'npx cap sync android && cd android && ./gradlew assembleDebug'
    }
  }, null, 2));

  // Android project structure
  const androidFolder = zip.folder('android');
  if (androidFolder) {
    androidFolder.file('build.gradle', `// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.1'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`);

    androidFolder.file('settings.gradle', `include ':app'
rootProject.name = "${appName}"
`);

    androidFolder.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
`);

    const appFolder = androidFolder.folder('app');
    if (appFolder) {
      appFolder.file('build.gradle', `plugins {
    id 'com.android.application'
}

android {
    namespace "com.mingree.influencer"
    compileSdk 34

    defaultConfig {
        applicationId "com.mingree.influencer"
        minSdk 26
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.coordinatorlayout:coordinatorlayout:1.2.0'
    implementation 'androidx.core:core-splashscreen:1.0.1'
    implementation 'com.google.android.material:material:1.11.0'
}
`);

      const mainFolder = appFolder.folder('src/main');
      if (mainFolder) {
        mainFolder.file('AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>
    </application>

</manifest>
`);

        const javaFolder = mainFolder.folder('java/com/mingree/influencer');
        if (javaFolder) {
          javaFolder.file('MainActivity.java', `package com.mingree.influencer;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Camera = __DummyIcon;



public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("https://mingree.com");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`);
        }

        const resValues = mainFolder.folder('res/values');
        if (resValues) {
          resValues.file('strings.xml', `<resources>
    <string name="app_name">${appName}</string>
    <string name="title_activity_main">${appName}</string>
    <string name="package_name">com.mingree.influencer</string>
</resources>
`);
          resValues.file('styles.xml', `<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">#FF3399</item>
        <item name="colorPrimaryDark">#E02684</item>
        <item name="colorAccent">#FF3399</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme">
        <item name="android:background">#0A0A0B</item>
    </style>
</resources>
`);
        }
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
