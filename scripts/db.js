export class Database {
  constructor() {
    this.dbName = "ChatUgandaDB";
    this.dbVersion = 2; // Version increased to add username index
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error("Database error:", event.target.error);
        reject(event.target.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create users store
        if (!db.objectStoreNames.contains("users")) {
          const usersStore = db.createObjectStore("users", {
            keyPath: "phone",
          });
          usersStore.createIndex("username", "username", { unique: true });
        } else {
          const usersStore =
            event.currentTarget.transaction.objectStore("users");
          if (!usersStore.indexNames.contains("username")) {
            usersStore.createIndex("username", "username", { unique: true });
          }
        }

        // Create messages store
        if (!db.objectStoreNames.contains("messages")) {
          const messagesStore = db.createObjectStore("messages", {
            keyPath: "id",
            autoIncrement: true,
          });
          messagesStore.createIndex("conversationId", "conversationId");
          messagesStore.createIndex("timestamp", "timestamp");
        }

        // Create conversations store
        if (!db.objectStoreNames.contains("conversations")) {
          const conversationsStore = db.createObjectStore("conversations", {
            keyPath: "id",
          });
          conversationsStore.createIndex("lastMessageTime", "lastMessageTime");
        }

        // Create groups store
        if (!db.objectStoreNames.contains("groups")) {
          const groupsStore = db.createObjectStore("groups", { keyPath: "id" });
          groupsStore.createIndex("name", "name");
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
    });
  }

  // User operations
  async addUser(user) {
    const transaction = this.db.transaction(["users"], "readwrite");
    const store = transaction.objectStore("users");
    return new Promise((resolve, reject) => {
      const request = store.add(user);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getUser(phone) {
    const transaction = this.db.transaction(["users"], "readonly");
    const store = transaction.objectStore("users");
    return new Promise((resolve, reject) => {
      const request = store.get(phone);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getUserByUsername(username) {
    const transaction = this.db.transaction(["users"], "readonly");
    const store = transaction.objectStore("users");
    const index = store.index("username");
    return new Promise((resolve, reject) => {
      const request = index.get(username);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getAllUsers() {
    const transaction = this.db.transaction(["users"], "readonly");
    const store = transaction.objectStore("users");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // Message operations
  async addMessage(message) {
    const transaction = this.db.transaction(["messages"], "readwrite");
    const store = transaction.objectStore("messages");
    return new Promise((resolve, reject) => {
      const request = store.add(message);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getMessages(conversationId) {
    const transaction = this.db.transaction(["messages"], "readonly");
    const store = transaction.objectStore("messages");
    const index = store.index("conversationId");
    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(conversationId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getMessage(id) {
    const transaction = this.db.transaction(["messages"], "readonly");
    const store = transaction.objectStore("messages");
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // Conversation operations
  async addConversation(conversation) {
    const transaction = this.db.transaction(["conversations"], "readwrite");
    const store = transaction.objectStore("conversations");
    return new Promise((resolve, reject) => {
      const request = store.add(conversation);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getConversation(conversationId) {
    const transaction = this.db.transaction(["conversations"], "readonly");
    const store = transaction.objectStore("conversations");
    return new Promise((resolve, reject) => {
      const request = store.get(conversationId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getAllConversations() {
    const transaction = this.db.transaction(["conversations"], "readonly");
    const store = transaction.objectStore("conversations");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // Group operations
  async createGroup(group) {
    const transaction = this.db.transaction(["groups"], "readwrite");
    const store = transaction.objectStore("groups");
    return new Promise((resolve, reject) => {
      const request = store.add(group);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getGroup(groupId) {
    const transaction = this.db.transaction(["groups"], "readonly");
    const store = transaction.objectStore("groups");
    return new Promise((resolve, reject) => {
      const request = store.get(groupId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getAllGroups() {
    const transaction = this.db.transaction(["groups"], "readonly");
    const store = transaction.objectStore("groups");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }
}
