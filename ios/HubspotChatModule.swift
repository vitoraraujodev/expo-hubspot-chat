import ExpoModulesCore
import SwiftUI
import UIKit
import HubspotMobileSDK

// @unchecked Sendable is required for Expo Modules conformance.
// All mutable state is guarded by @MainActor.
public class HubspotChatModule: Module, @unchecked Sendable {
  @MainActor
  private var presentedChatController: UIViewController?

  @MainActor
  private var dismissDelegate: HubspotChatDismissDelegate?

  public func definition() -> ModuleDefinition {
    Name("HubspotChat")

    Events("onHubspotChatEvent")

    AsyncFunction("initialize") {
      guard let plistPath = Bundle.main.path(forResource: "Hubspot-Info", ofType: "plist"),
            let plistData = NSDictionary(contentsOfFile: plistPath) else {
        throw HubspotConfigurationException()
      }
      
      guard let portalId = plistData["portalId"] as? String,
            let hublet = plistData["hublet"] as? String else {
        throw HubspotConfigurationException()
      }
      
      let environmentString = plistData["environment"] as? String ?? "production"
      let environment: HubspotEnvironment = environmentString == "qa" ? .qa : .production
      let defaultChatFlow = plistData["defaultChatFlow"] as? String
      
      await HubspotManager.configure(
        portalId: portalId,
        hublet: hublet,
        defaultChatFlow: defaultChatFlow,
        environment: environment
      )
    }

    AsyncFunction("setUserIdentity") { (email: String, identityToken: String) in
      await HubspotManager.shared.setUserIdentity(identityToken: identityToken, email: email)
    }

    AsyncFunction("openChat") { (chatFlow: String?, presentationStyle: String?) in
      try await MainActor.run {
        guard let rootVC = self.topViewController() else {
          self.sendEvent("onHubspotChatEvent", [
            "type": "chatError",
            "error": "No root view controller found"
          ])
          throw HubspotChatException()
        }

        let chatView: HubspotChatView
        if let flow = chatFlow {
          chatView = HubspotChatView(chatFlow: flow)
        } else {
          chatView = HubspotChatView()
        }

        let hostingVC = UIHostingController(rootView: chatView)
        hostingVC.modalPresentationStyle = self.mapPresentationStyle(presentationStyle)

        let delegate = HubspotChatDismissDelegate(module: self)
        hostingVC.presentationController?.delegate = delegate
        self.dismissDelegate = delegate

        self.presentedChatController = hostingVC

        rootVC.present(hostingVC, animated: true) {
          Task { @MainActor in
            self.sendEvent("onHubspotChatEvent", ["type": "chatOpened"])
          }
        }
      }
    }

    AsyncFunction("closeChat") {
      await MainActor.run {
        guard let controller = self.presentedChatController else { return }
        controller.dismiss(animated: true) {
          Task { @MainActor in
            self.presentedChatController = nil
            self.dismissDelegate = nil
            self.sendEvent("onHubspotChatEvent", ["type": "chatClosed"])
          }
        }
      }
    }

    AsyncFunction("setChatProperties") { (properties: [String: String]) in
      await HubspotManager.shared.setChatProperties(data: properties)
    }

    AsyncFunction("clearUser") {
      await HubspotManager.shared.clearUserData()
    }
  }

  @MainActor
  func handleDismiss() {
    presentedChatController = nil
    dismissDelegate = nil
    sendEvent("onHubspotChatEvent", ["type": "chatClosed"])
  }

  @MainActor
  private func topViewController() -> UIViewController? {
    guard let windowScene = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .first,
      let window = windowScene.windows.first(where: { $0.isKeyWindow }),
      var topController = window.rootViewController else {
      return nil
    }

    while let presented = topController.presentedViewController {
      topController = presented
    }

    return topController
  }

  private func mapPresentationStyle(_ style: String?) -> UIModalPresentationStyle {
    switch style {
    case "fullScreen": return .fullScreen
    case "formSheet": return .formSheet
    case "overFullScreen": return .overFullScreen
    default: return .pageSheet
    }
  }
}

internal final class HubspotChatException: Exception {
  override var reason: String {
    "Could not open chat: no root view controller found. Make sure the app has a visible window."
  }
}

internal final class HubspotConfigurationException: Exception {
  override var reason: String {
    "HubSpot configuration failed: Could not read Hubspot-Info.plist or missing required fields (portalId, hublet)."
  }
}

internal class HubspotChatDismissDelegate: NSObject, UIAdaptivePresentationControllerDelegate {
  weak var module: HubspotChatModule?

  init(module: HubspotChatModule) {
    self.module = module
    super.init()
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    module?.handleDismiss()
  }
}
