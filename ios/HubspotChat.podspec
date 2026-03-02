require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'HubspotChat'
  s.version        = package['version']
  s.summary        = 'Expo module for HubSpot Mobile Chat SDK'
  s.description    = 'Bridge between Expo and HubSpot native Mobile Chat SDKs'
  s.author         = 'Vitor Araujo <https://github.com/vitoraraujodev>'
  s.homepage       = 'https://github.com/vitoraraujodev/expo-hubspot-chat'
  s.license        = { type: 'MIT' }
  s.platforms      = { :ios => '15.0' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/vitoraraujodev/expo-hubspot-chat.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.vendored_frameworks = 'Frameworks/HubspotMobileSDK.xcframework'
  s.resources = ['Frameworks/HubspotMobileSDK_HubspotMobileSDK.bundle']

  s.source_files = '*.swift'
end
