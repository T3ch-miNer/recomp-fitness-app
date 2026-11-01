package com.t3chminer.recomp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.recomp.health.RecompHealthPlugin;
import com.recomp.health.RecompAuthPlugin;
import com.recomp.health.RecompAuthCallback;
import com.recomp.health.RecompWellbeingPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RecompHealthPlugin.class);
        registerPlugin(RecompWellbeingPlugin.class);
        registerPlugin(RecompAuthPlugin.class);
        super.onCreate(savedInstanceState);
        // Clerk's default callback includes the actual installed package name,
        // including the ".beta" suffix used by CI debug builds.
        RecompAuthCallback.handle(getIntent(), getPackageName());
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        RecompAuthCallback.handle(intent, getPackageName());
    }
}
