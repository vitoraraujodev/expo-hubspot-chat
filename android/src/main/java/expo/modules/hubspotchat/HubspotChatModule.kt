package expo.modules.hubspotchat

import android.app.Activity
import android.app.Application
import android.content.Intent
import android.os.Bundle
import com.hubspot.mobilesdk.HubspotManager
import com.hubspot.mobilesdk.HubspotWebActivity
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

class HubspotChatModule : Module() {

  private val manager: HubspotManager
    get() = HubspotManager.getInstance(requireNotNull(appContext.reactContext))

  private var chatActivityOpen = false
  private var chatActivityRef: WeakReference<Activity>? = null
  private var lifecycleCallbacks: Application.ActivityLifecycleCallbacks? = null

  override fun definition() = ModuleDefinition {
    Name("HubspotChat")

    Events("onHubspotChatEvent")

    OnDestroy {
      unregisterLifecycleCallbacks()
    }

    Function("initialize") {
      manager.configure()
    }

    Function("setUserIdentity") { email: String, identityToken: String ->
      manager.setUserIdentity(email, identityToken)
    }

    Function("openChat") { chatFlow: String?, _: String? ->
      val activity = appContext.currentActivity
        ?: throw HubspotChatNoActivityException()

      val intent = Intent(activity, HubspotWebActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        chatFlow?.let { putExtra("chatFlow", it) }
      }

      registerLifecycleCallbacks()
      activity.startActivity(intent)
    }

    Function("closeChat") {
      val chatActivity = chatActivityRef?.get()
      if (chatActivityOpen && chatActivity != null && !chatActivity.isFinishing) {
        chatActivity.finish()
      }
    }

    Function("setChatProperties") { properties: Map<String, String> ->
      manager.setChatProperties(properties)
    }

    AsyncFunction("clearUser") Coroutine { ->
      manager.logout()
    }
  }

  private fun registerLifecycleCallbacks() {
    if (lifecycleCallbacks != null) return

    val app = appContext.reactContext?.applicationContext as? Application ?: return

    lifecycleCallbacks = object : Application.ActivityLifecycleCallbacks {
      override fun onActivityResumed(activity: Activity) {
        if (activity is HubspotWebActivity && !chatActivityOpen) {
          chatActivityOpen = true
          chatActivityRef = WeakReference(activity)
          sendEvent("onHubspotChatEvent", mapOf("type" to "chatOpened"))
        }
      }

      override fun onActivityDestroyed(activity: Activity) {
        if (activity is HubspotWebActivity && chatActivityOpen) {
          chatActivityOpen = false
          chatActivityRef = null
          sendEvent("onHubspotChatEvent", mapOf("type" to "chatClosed"))
        }
      }

      override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
      override fun onActivityStarted(activity: Activity) {}
      override fun onActivityPaused(activity: Activity) {}
      override fun onActivityStopped(activity: Activity) {}
      override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    }

    app.registerActivityLifecycleCallbacks(lifecycleCallbacks)
  }

  private fun unregisterLifecycleCallbacks() {
    lifecycleCallbacks?.let { callbacks ->
      val app = appContext.reactContext?.applicationContext as? Application
      app?.unregisterActivityLifecycleCallbacks(callbacks)
    }
    lifecycleCallbacks = null
    chatActivityRef = null
  }
}

internal class HubspotChatNoActivityException :
  CodedException("ERR_HUBSPOT_CHAT_NO_ACTIVITY", "Could not open chat: no current activity found. Make sure the app is in the foreground.", null)
