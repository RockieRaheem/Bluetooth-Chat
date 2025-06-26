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

  async sendMessage(conversationId, content) {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const message = {
      conversationId,
      sender: currentUser.phone,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };

    await this.db.addMessage(message);

    // Update conversation last message
    const conversation = await this.db.getConversation(conversationId);
    if (conversation) {
      conversation.lastMessage = content;
      conversation.lastMessageTime = message.timestamp;
      await this.db.addConversation(conversation); // Overwrite existing
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
}
