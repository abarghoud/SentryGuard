import { KafkaMessage } from "kafkajs";

export const kafkaMessageHandler = Symbol('MessageHandler');

export interface MessageHandler {
  handleMessage(
    message: KafkaMessage,
    commit: () => Promise<void>
  ): Promise<void>;
}

