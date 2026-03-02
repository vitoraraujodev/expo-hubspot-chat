import { requireNativeModule } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';

import type { HubspotChatEvent } from './HubspotChat.types';

interface HubspotChatNativeModule {
  initialize(): void;
  setUserIdentity(email: string, identityToken: string): void;
  openChat(chatFlow: string | null, presentationStyle: string | null): void;
  setChatProperties(properties: Record<string, string>): void;
  clearUser(): void;
  closeChat(): void;
  addListener(
    eventName: 'onHubspotChatEvent',
    listener: (event: HubspotChatEvent) => void,
  ): EventSubscription;
}

export default requireNativeModule<HubspotChatNativeModule>('HubspotChat');
