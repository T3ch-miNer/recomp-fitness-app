package com.t3chminer.recomp

import android.app.Application
import com.clerk.api.Clerk

/** Native Clerk is intentionally separate from the browser-only Clerk JS session. */
class RecompClerkApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // This is the *public* development key already bundled in clerk-auth.js.
        // Replace with the owner's public production key before production release.
        Clerk.initialize(this, publishableKey = "pk_test_Z2l2aW5nLXRvbWNhdC04Njc0LmNsZXJrLmFjY291bnRzLmRldiQ")
    }
}
