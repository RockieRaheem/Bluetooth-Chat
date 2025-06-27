import { Database } from "./db.js";
import { Auth } from "./auth.js";

export class Chat {
  constructor() {
    this.db = new Database();
    this.auth = new Auth();
    this.currentConversation = null;
  }

  async init() {
    await this.db.init();
    await this.auth.init();
  }

  async createConversation(participantPhone) {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Create a unique conversation ID (sorted phone numbers)
    const phones = [currentUser.phone, participantPhone].sort();
    const conversationId = phones.join("_");

    // Check if conversation already exists
    const existingConversation = await this.db.getConversation(conversationId);
    if (existingConversation) {
      return existingConversation;
    }

    const conversation = {
      id: conversationId,
      participants: phones,
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
    };

    await this.db.addConversation(conversation);
    return conversation;
  }

  async sendMessage(conversationId, content, sender = null, messageId = null) {
    const currentUser = this.auth.getCurrentUser();
    const msgSender = sender || currentUser.phone;
    const id = messageId || `${conversationId}-${Date.now()}-${Math.random()}`;
    const message = {
      id,
      conversationId,
      sender: msgSender,
      content,
      timestamp: new Date().toISOString(),
    };
    // Check if message already exists
    const existing = await this.db.getMessage(id);
    if (!existing) {
      await this.db.addMessage(message);
    }
    return message;
  }

  async getMessages(conversationId) {
    return this.db.getMessages(conversationId);
  }

  async getConversations() {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    const allConversations = await this.db.getAllConversations();
    return allConversations.filter((conv) =>
      conv.participants.includes(currentUser.phone)
    );
  }

  async createGroup(name, participants) {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Add current user to participants
    const allParticipants = [...new Set([...participants, currentUser.phone])];

    const group = {
      id: "group_" + Date.now(),
      name,
      participants: allParticipants,
      admin: currentUser.phone,
      createdAt: new Date().toISOString(),
    };

    await this.db.createGroup(group);
    return group;
  }

  async getGroups() {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    const allGroups = await this.db.getAllGroups();
    return allGroups.filter((group) =>
      group.participants.includes(currentUser.phone)
    );
  }

  async getConversationWith(phone) {
    const conversations = await this.getConversations();
    return conversations.find((conv) => conv.participants.includes(phone));
  }
}
