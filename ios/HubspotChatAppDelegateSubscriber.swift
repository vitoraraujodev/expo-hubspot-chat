import ExpoModulesCore
import UIKit
import HubspotMobileSDK

public class HubspotChatAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Task { @MainActor in
      HubspotManager.shared.setPushToken(apnsPushToken: deviceToken)
    }
  }
}
