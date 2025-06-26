import { Database } from "./db.js";

export class Auth {
  constructor() {
    this.db = new Database();
    this.currentUser = null;
  }

  async init() {
    await this.db.init();
    // Check if we have a logged-in user in localStorage
    const savedUserPhone = localStorage.getItem("currentUserPhone");
    if (savedUserPhone) {
      this.currentUser = await this.db.getUser(savedUserPhone);
    }
  }

  async register(phone, username, avatar) {
    // Validate Ugandan phone number format (+256XXXXXXXXX)
    const phoneRegex = /^\+256\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error(
        "Please enter a valid Ugandan phone number starting with +256"
      );
    }

    // Check if user already exists by phone
    const existingUserByPhone = await this.db.getUser(phone);
    if (existingUserByPhone) {
      throw new Error("A user with this phone number already exists");
    }

    // Check if user already exists by username
    const existingUserByUsername = await this.db.getUserByUsername(username);
    if (existingUserByUsername) {
      throw new Error("Username is already taken");
    }

    const user = {
      phone,
      username,
      avatar,
      createdAt: new Date().toISOString(),
    };

    await this.db.addUser(user);
    return user;
  }

  async login(phone) {
    const user = await this.db.getUser(phone);
    if (!user) {
      throw new Error("User not found");
    }

    this.currentUser = user;
    localStorage.setItem("currentUserPhone", phone);
    return user;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem("currentUserPhone");
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}
