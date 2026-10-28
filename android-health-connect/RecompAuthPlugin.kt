package com.recomp.health

import android.content.Intent
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.ClerkResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first

// OAuth sessions and tokens stay inside the official native Clerk SDK.
// JavaScript receives *only* non-sensitive account identity for the UI.
@CapacitorPlugin(name = "RecompAuth")
class RecompAuthPlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.Main)

    private suspend fun ready(): Boolean = withTimeoutOrNull(12000L) {
        Clerk.isInitialized.filter { it }.first()
        true
    } ?: false

    private fun account(): JSObject {
        val person = Clerk.activeUser
        return JSObject().apply {
            if (person == null) {
                put("user", JSObject.NULL)
            } else {
                val profile = JSObject().apply {
                    put("id", person.id)
                    put("firstName", person.firstName ?: "")
                    put("lastName", person.lastName ?: "")
                    put("name", listOfNotNull(person.firstName, person.lastName)
                        .joinToString(" ").ifBlank { "Google account" })
                }
                put("user", profile)
            }
        }
    }

    @PluginMethod
    fun getAccount(call: PluginCall) {
        scope.launch {
            try {
                if (!ready()) call.reject("Native sign-in is still initialising. Open Recomp again.")
                else call.resolve(account())
            } catch (error: Exception) {
                call.reject("Could not read your account: " + (error.message ?: "Unknown error"))
            }
        }
    }

    @PluginMethod
    fun signIn(call: PluginCall) {
        scope.launch {
            try {
                if (!ready()) {
                    call.reject("Native sign-in is still initialising. Please retry.")
                    return@launch
                }
                // The Clerk SDK starts Chrome Custom Tabs and resumes via a
                // validated native callback; never use an embedded WebView for OAuth.
                when (val result = Clerk.auth.startHostedAuth()) {
                    is ClerkResult.Success -> call.resolve(account())
                    is ClerkResult.Failure -> call.reject(
                        "Sign-in was cancelled or couldn't complete. Check Clerk Native API / Google setup, then retry."
                    )
                }
            } catch (error: Exception) {
                call.reject("Native Google sign-in failed: " + (error.message ?: "Unknown error"))
            }
        }
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        scope.launch {
            try {
                if (!ready()) {
                    call.reject("Native sign-in is not ready.")
                    return@launch
                }
                Clerk.auth.signOut()
                call.resolve(account())
            } catch (error: Exception) {
                call.reject("Could not sign out: " + (error.message ?: "Unknown error"))
            }
        }
    }
}

// Capacitor MainActivity forwards deep links only to Clerk's OAuth handler;
// no OAuth code, ticket, access token, or other credential is forwarded to JS.
object RecompAuthCallback {
    @JvmStatic
    fun handle(intent: Intent?) {
        intent?.data?.let { url ->
            if (url.scheme == "clerk" && url.host == "com.t3chminer.recomp.callback") {
                CoroutineScope(Dispatchers.Main).launch {
                    Clerk.auth.handle(url)
                }
            }
        }
    }
}
