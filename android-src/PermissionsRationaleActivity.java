package com.t3chminer.recomp;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

// Visible from Health Connect's permission request screen.
// A published app must also provide a public privacy policy with equivalent information.
public class PermissionsRationaleActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 64, 48, 48);
        root.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this);
        title.setText("Recomp · Health Connect");
        title.setTextSize(24);
        root.addView(title, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        TextView description = new TextView(this);
        description.setText("\nRecomp requests read-only access to daily steps and active calories.\n\n" +
            "You choose whether to grant permission. Recomp uses this information to update activity tracking. " +
            "The data stays on this device unless you separately opt in to Recomp's private cloud backup. " +
            "You can revoke access at any time in Health Connect settings.\n\n" +
            "Recomp does not sell health or phone usage data.");
        description.setTextSize(16);
        root.addView(description);
        setContentView(root);
    }
}
