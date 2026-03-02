export interface HubspotUserIdentity {
  /** User email address used to identify them in HubSpot */
  email: string;
  /** Identity verification token generated server-side via HubSpot's Visitor Identification API */
  identityToken: string;
}

/** Key-value pairs sent as custom chat properties to HubSpot */
export type HubspotChatProperties = Record<string, string>;

/** iOS modal presentation style for the chat view */
export type HubspotChatPresentationStyle =
  | 'pageSheet'
  | 'fullScreen'
  | 'formSheet'
  | 'overFullScreen';

export interface OpenChatOptions {
  /** Chat flow identifier. Overrides `defaultChatFlow` from the plugin config. */
  chatFlow?: string;
  /** iOS-only: modal presentation style. Defaults to "pageSheet". */
  presentationStyle?: HubspotChatPresentationStyle;
}

export type HubspotChatEventType = 'chatOpened' | 'chatClosed' | 'chatError';

export interface HubspotChatEvent {
  type: HubspotChatEventType;
  /** Error message, only present when type is "chatError" */
  error?: string;
}
