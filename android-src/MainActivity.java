package com.t3chminer.recomp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.recomp.health.RecompHealthPlugin;
import com.recomp.health.RecompWellbeingPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RecompHealthPlugin.class);
        registerPlugin(RecompWellbeingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
