export type SendMessageInput = {
  accountId: string;
  to: string;
  text: string;
  conversationId: string;
};

export type SendMessageResult = {
  externalMessageId: string;
  acceptedAt: string;
};

export interface WhatsappProviderPort {
  sendTextMessage(input: SendMessageInput): Promise<SendMessageResult>;
}
