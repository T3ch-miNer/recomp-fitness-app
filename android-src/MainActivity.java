package com.t3chminer.recomp;

import android.os.Bundle;
import android.content.Intent;
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
        RecompAuthCallback.handle(getIntent());
    }
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        RecompAuthCallback.handle(intent);
    }
}
