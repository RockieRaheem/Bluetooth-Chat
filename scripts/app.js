import { Auth } from "./auth.js";
import { Chat } from "./chat.js";
import * as webrtc from "./webrtc.js";

const auth = new Auth();
const chat = new Chat();

let autoOpenChatId = null;
let autoOpenChatType = null;

// Initialize the application
async function initApp() {
  await auth.init();
  await chat.init();

  if (auth.isAuthenticated()) {
    renderChatApp();
  } else {
    renderAuthScreen();
  }
}

// Render authentication screen
function renderAuthScreen() {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="flag-container">
            <div class="flag-stripe flag-black"></div>
            <div class="flag-stripe flag-yellow"></div>
            <div class="flag-stripe flag-red"></div>
            <div class="flag-stripe flag-black"></div>
          </div>
          <h2>ChatUganda</h2>
          <p>Offline Chat for Nearby Users</p>
        </div>
        <div class="auth-body">
          <div id="authForm"></div>
        </div>
      </div>
    </div>
  `;
  renderAuthForm();
}

// Render authentication form
function renderAuthForm(isSignup = true) {
  const authForm = document.getElementById("authForm");
  authForm.innerHTML = `
    <h4 class="mb-4 text-center">${isSignup ? "Create Account" : "Login to Chat"}</h4>
    <form id="${isSignup ? "signupForm" : "loginForm"}">
      ${isSignup ? `
        <div class="mb-3">
          <label class="form-label">Username</label>
          <input type="text" class="form-control" id="username" required>
          <div class="form-text">Choose a unique username</div>
        </div>
        <div class="mb-3">
          <label class="form-label">Choose Avatar</label>
          <div class="avatar-selector">
            <div class="avatar-option bg-primary" data-avatar="A">A</div>
            <div class="avatar-option bg-success" data-avatar="B">B</div>
            <div class="avatar-option bg-danger" data-avatar="C">C</div>
            <div class="avatar-option bg-warning" data-avatar="D">D</div>
          </div>
          <input type="hidden" id="avatar" value="A">
        </div>
      ` : ""}
      <div class="mb-3">
        <label class="form-label">Phone Number</label>
        <div class="input-group">
          <span class="input-group-text country-code">+256</span>
          <input type="tel" class="form-control phone-input" id="phone" placeholder="700123456" pattern="[0-9]{9}" required>
        </div>
        <div class="form-text">Enter your 9-digit Ugandan phone number without +256</div>
      </div>
      <div class="d-grid">
        <button type="submit" class="btn btn-uganda btn-lg">
          ${isSignup ? "Create Account" : "Login"}
        </button>
      </div>
    </form>
    <div class="login-prompt">
      ${isSignup
        ? 'Already have an account? <a href="#" id="loginLink">Login here</a>'
        : 'New to ChatUganda? <a href="#" id="signupLink">Create an account</a>'
      }
    </div>
  `;

  if (isSignup) {
    const avatarOptions = document.querySelectorAll(".avatar-option");
    const avatarInput = document.getElementById("avatar");
    avatarOptions.forEach((option) => {
      option.addEventListener("click", () => {
        avatarOptions.forEach((opt) => opt.classList.remove("selected"));
        option.classList.add("selected");
        avatarInput.value = option.textContent;
      });
    });
    avatarOptions[0].classList.add("selected");
  }

  const formId = isSignup ? "signupForm" : "loginForm";
  document.getElementById(formId).addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = "+256" + document.getElementById("phone").value;
    if (isSignup) {
      const username = document.getElementById("username").value;
      const avatar = document.getElementById("avatar").value;
      try {
        const user = await auth.register(phone, username, avatar);
        await auth.login(user.phone);
        renderChatApp();
      } catch (error) {
        alert(error.message);
      }
    } else {
      try {
        await auth.login(phone);
        renderChatApp();
      } catch (error) {
        alert(error.message);
      }
    }
  });

  const switchLinkId = isSignup ? "loginLink" : "signupLink";
  document.getElementById(switchLinkId).addEventListener("click", (e) => {
    e.preventDefault();
    renderAuthForm(!isSignup);
  });
}

// Render chat application
function renderChatApp() {
  const currentUser = auth.getCurrentUser();
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="container-fluid app-container p-0">
      <div class="row g-0 h-100">
        <!-- Sidebar -->
        <div class="col-md-3 d-flex flex-column sidebar">
          <div class="profile-section">
            <div class="profile-avatar" style="background-color: ${getColorFromChar(currentUser.avatar)}">
              ${currentUser.avatar}
            </div>
            <h5 class="mb-0">${currentUser.username}</h5>
            <div class="d-flex align-items-center justify-content-center mt-2">
              <span class="status-indicator status-online"></span>
              <span>Online</span>
            </div>
            <div class="welcome-message">Chat with nearby friends offline!</div>
          </div>
          <div class="p-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h4>Chats</h4>
              <button class="btn btn-sm new-chat-btn" id="newChatBtn">
                <i class="bi bi-plus-lg"></i>
              </button>
            </div>
            <div class="input-group mb-3">
              <span class="input-group-text bg-white">
                <i class="bi bi-search"></i>
              </span>
              <input type="text" class="form-control" placeholder="Search chats..." id="searchInput">
            </div>
            <div class="list-group" id="chatList"></div>
          </div>
          <div class="mt-auto p-3 text-center">
            <div class="offline-badge mb-2">
              <i class="bi bi-wifi-off me-1"></i> Nearby Mode
            </div>
            <p class="text-white-50 small mt-2">
              Messages deliver when devices are close together
            </p>
            <button class="btn btn-sm btn-outline-light w-100" id="logoutBtn">
              <i class="bi bi-box-arrow-right me-1"></i> Logout
            </button>
            <button class="btn btn-outline-warning w-100 mt-2" id="peerConnectBtn">
              <i class="bi bi-link-45deg me-1"></i> Peer Connect
            </button>
          </div>
        </div>
        <!-- Main Content -->
        <div class="col-md-9 chat-container" id="chatContainer">
          <div class="d-flex flex-column justify-content-center align-items-center h-100">
            <div class="text-center p-5">
              <div class="bg-light rounded-circle p-4 d-inline-block mb-4">
                <i class="bi bi-chat-dots-fill text-primary" style="font-size: 3rem;"></i>
              </div>
              <h2>Welcome to ChatUganda</h2>
              <p class="text-muted mb-4">
                Chat with nearby friends without internet!
              </p>
              <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i> 
                Messages will be delivered when your device is physically near other users
              </div>
              <button class="btn btn-primary mt-3" id="startNewChatBtn">
                <i class="bi bi-plus-lg me-2"></i> Start New Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  loadChats();
  document.getElementById("newChatBtn").addEventListener("click", startNewChat);
  document.getElementById("startNewChatBtn").addEventListener("click", startNewChat);
  document.getElementById("logoutBtn").addEventListener("click", () => {
    auth.logout();
    renderAuthScreen();
  });
  document.getElementById("peerConnectBtn").addEventListener("click", showPeerModal);
}

// Get color based on character for avatar
function getColorFromChar(char) {
  const colors = [
    "#6f42c1", "#20c997", "#fd7e14", "#e83e8c",
    "#0dcaf0", "#198754", "#ffc107", "#0d6efd"
  ];
  const index = char.charCodeAt(0) % colors.length;
  return colors[index];
}

// Load chats for the sidebar
async function loadChats() {
  const chatList = document.getElementById("chatList");
  chatList.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-light" role="status"></div></div>';
  try {
    const conversations = await chat.getConversations();
    const groups = await chat.getGroups();
    const allChats = [...conversations, ...groups];
    allChats.sort(
      (a, b) =>
        new Date(b.lastMessageTime || b.createdAt) -
        new Date(a.lastMessageTime || a.createdAt)
    );
    if (allChats.length === 0) {
      chatList.innerHTML = `
        <div class="text-center py-4 text-white-50">
          <i class="bi bi-chat-left-dots" style="font-size: 2rem;"></i>
          <p class="mt-2">No chats yet<br>Start a new conversation</p>
        </div>
      `;
      return;
    }
    let chatItems = "";
    for (const chatItem of allChats) {
      if (chatItem.participants) {
        // Conversation
        const otherPhone = chatItem.participants.find(
          (p) => p !== auth.getCurrentUser().phone
        );
        const otherUser = await auth.db.getUser(otherPhone);
        if (!otherUser) continue;
        chatItems += `
          <div class="list-group-item chat-item bg-transparent border-0 text-white d-flex align-items-center" 
            data-id="${chatItem.id}" data-type="conversation">
            <div class="position-relative me-3">
              <div class="user-avatar" style="background-color: ${getColorFromChar(otherUser.avatar)}">
                ${otherUser.avatar}
              </div>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between">
                <strong>${otherUser.username}</strong>
                <small>${formatTime(chatItem.lastMessageTime)}</small>
              </div>
              <div class="text-white-50">
                ${chatItem.lastMessage || "No messages yet"}
              </div>
            </div>
          </div>
        `;
      } else {
        // Group
        chatItems += `
          <div class="list-group-item chat-item bg-transparent border-0 text-white d-flex align-items-center" 
            data-id="${chatItem.id}" data-type="group">
            <div class="group-avatar me-3">
              <i class="bi bi-people-fill"></i>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between">
                <strong>${chatItem.name}</strong>
                <small>${formatTime(chatItem.lastMessageTime)}</small>
              </div>
              <div class="text-white-50">
                ${chatItem.lastMessage || "No messages yet"}
              </div>
            </div>
          </div>
        `;
      }
    }
    chatList.innerHTML = chatItems;
    document.querySelectorAll(".chat-item").forEach((item) => {
      item.addEventListener("click", () => {
        const chatId = item.getAttribute("data-id");
        const chatType = item.getAttribute("data-type");
        openChat(chatId, chatType);
      });
    });
  } catch (error) {
    console.error("Error loading chats:", error);
    chatList.innerHTML = `
      <div class="text-center py-4 text-white-50">
        <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>
        <p class="mt-2">Error loading chats</p>
      </div>
    `;
  }
}

// Format time for display
function formatTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString();
}

// Start a new chat
async function startNewChat() {
  try {
    const users = await auth.db.getAllUsers();
    const currentUser = auth.getCurrentUser();
    const otherUsers = users.filter((u) => u.phone !== currentUser.phone);
    if (otherUsers.length === 0) {
      alert("No other users found. Tell your friends to sign up!");
      return;
    }
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center h-100 p-3">
        <div class="card" style="max-width: 600px; width: 100%;">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Start New Chat</h5>
          </div>
          <div class="card-body">
            <div class="alert alert-info mb-3">
              <i class="bi bi-info-circle me-2"></i>
              You can only chat with users when your devices are nearby
            </div>
            <h6 class="mb-3">Select a contact to chat with:</h6>
            <div class="list-group" id="contactList">
              ${otherUsers
                .map(
                  (user) => `
                  <div class="list-group-item list-group-item-action d-flex align-items-center contact-item" 
                    data-phone="${user.phone}">
                    <div class="user-avatar me-3" style="background-color: ${getColorFromChar(user.avatar)}">
                      ${user.avatar}
                    </div>
                    <div>
                      <strong>${user.username}</strong>
                      <div class="text-muted small">${user.phone}</div>
                    </div>
                  </div>
                `
                )
                .join("")}
            </div>
            <div class="mt-4">
              <h6 class="mb-3">Or create a group chat:</h6>
              <button class="btn btn-outline-primary w-100" id="createGroupBtn">
                <i class="bi bi-people-fill me-2"></i> Create Group
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.querySelectorAll(".contact-item").forEach((item) => {
      item.addEventListener("click", async () => {
        const phone = item.getAttribute("data-phone");
        const conversation = await chat.createConversation(phone);
        openChat(conversation.id, "conversation");
      });
    });
    document.getElementById("createGroupBtn").addEventListener("click", createGroup);
  } catch (error) {
    console.error("Error starting new chat:", error);
    alert("Failed to start new chat");
  }
}

// Create a new group
async function createGroup() {
  try {
    const users = await auth.db.getAllUsers();
    const currentUser = auth.getCurrentUser();
    const otherUsers = users.filter((u) => u.phone !== currentUser.phone);
    if (otherUsers.length === 0) {
      alert("No other users found. Tell your friends to sign up!");
      return;
    }
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center h-100 p-3">
        <div class="card" style="max-width: 600px; width: 100%;">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Create Group</h5>
          </div>
          <div class="card-body">
            <div class="alert alert-info mb-3">
              <i class="bi bi-info-circle me-2"></i>
              Group messages will be delivered when all devices are nearby
            </div>
            <div class="mb-3">
              <label class="form-label">Group Name</label>
              <input type="text" class="form-control" id="groupName" placeholder="Enter group name" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Select Members</label>
              <div class="list-group" id="groupMemberList">
                ${otherUsers
                  .map(
                    (user) => `
                    <div class="list-group-item d-flex align-items-center">
                      <div class="form-check flex-grow-1">
                        <input class="form-check-input" type="checkbox" value="${user.phone}" id="user-${user.phone}">
                        <label class="form-check-label d-flex align-items-center" for="user-${user.phone}">
                          <div class="user-avatar me-3" style="background-color: ${getColorFromChar(user.avatar)}">
                            ${user.avatar}
                          </div>
                          <div>
                            <strong>${user.username}</strong>
                            <div class="text-muted small">${user.phone}</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  `
                  )
                  .join("")}
              </div>
            </div>
            <div class="d-grid">
              <button class="btn btn-primary" id="createGroupSubmit">
                <i class="bi bi-people-fill me-2"></i> Create Group
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById("createGroupSubmit").addEventListener("click", async () => {
      const groupName = document.getElementById("groupName").value;
      if (!groupName) {
        alert("Please enter a group name");
        return;
      }
      const selectedMembers = [];
      document.querySelectorAll("#groupMemberList input:checked").forEach((checkbox) => {
        selectedMembers.push(checkbox.value);
      });
      if (selectedMembers.length === 0) {
        alert("Please select at least one member");
        return;
      }
      try {
        const group = await chat.createGroup(groupName, selectedMembers);
        openChat(group.id, "group");
      } catch (error) {
        console.error("Error creating group:", error);
        alert("Failed to create group");
      }
    });
  } catch (error) {
    console.error("Error creating group:", error);
    alert("Failed to create group");
  }
}

// Modify openChat to remember the last opened chat
async function openChat(chatId, chatType) {
  autoOpenChatId = chatId;
  autoOpenChatType = chatType;

  try {
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML = `
      <div class="chat-header d-flex align-items-center">
        <button class="btn btn-sm btn-light me-2 d-md-none" id="backToChats">
          <i class="bi bi-arrow-left"></i>
        </button>
        <div class="flex-grow-1">
          <h5 id="chatTitle">Loading...</h5>
        </div>
      </div>
      <div class="messages-container" id="messagesContainer">
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      </div>
      <div class="message-input">
        <form id="messageForm">
          <div class="input-group">
            <input type="text" class="form-control" placeholder="Type a message..." id="messageInput" required>
            <button class="btn btn-primary" type="submit">
              <i class="bi bi-send"></i>
            </button>
          </div>
          <div class="form-text text-center mt-2">
            <i class="bi bi-info-circle me-1"></i>
            Message will deliver when devices are nearby
          </div>
        </form>
      </div>
    `;
    document.getElementById("backToChats").addEventListener("click", renderChatApp);

    let chatTitle = "";
    let avatarContent = "";
    if (chatType === "conversation") {
      const conversation = await chat.db.getConversation(chatId);
      const otherPhone = conversation.participants.find(
        (p) => p !== auth.getCurrentUser().phone
      );
      const otherUser = await auth.db.getUser(otherPhone);
      if (otherUser) {
        chatTitle = otherUser.username;
        avatarContent = `
          <div class="user-avatar me-3" style="background-color: ${getColorFromChar(otherUser.avatar)}">
            ${otherUser.avatar}
          </div>
        `;
      }
    } else if (chatType === "group") {
      const group = await chat.db.getGroup(chatId);
      if (group) {
        chatTitle = group.name;
        avatarContent = `
          <div class="group-avatar me-3">
            <i class="bi bi-people-fill"></i>
          </div>
        `;
      }
    }
    document.getElementById("chatTitle").innerHTML = `${avatarContent}${chatTitle}`;

    const messages = await chat.db.getMessages(chatId);
    renderMessages(messages);

    document.getElementById("messageForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const messageInput = document.getElementById("messageInput");
      const content = messageInput.value.trim();
      if (content) {
        try {
          await chat.sendMessage(chatId, content);
          webrtc.sendPeerMessage(
            JSON.stringify({
              chatId,
              content,
              sender: auth.getCurrentUser().phone,
            })
          );
          messageInput.value = "";
          const updatedMessages = await chat.db.getMessages(chatId);
          renderMessages(updatedMessages);
        } catch (error) {
          console.error("Error sending message:", error);
          alert("Failed to send message");
        }
      }
    });
  } catch (error) {
    console.error("Error opening chat:", error);
    alert("Failed to open chat");
  }
}

// Render messages in the chat
function renderMessages(messages) {
  const messagesContainer = document.getElementById("messagesContainer");
  if (messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-chat-dots" style="font-size: 3rem; color: #e9ecef;"></i>
        <h5 class="mt-3 text-muted">No messages yet</h5>
        <p>Send a message when devices are nearby</p>
      </div>
    `;
    return;
  }
  const currentUser = auth.getCurrentUser();
  let messagesHTML = "";
  messages.forEach((msg) => {
    const isSent = msg.sender === currentUser.phone;
    messagesHTML += `
      <div class="message-bubble ${isSent ? "sent" : "received"}">
        ${msg.content}
        <span class="timestamp">
          ${new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          ${isSent ? '<i class="bi bi-check2-all ms-1"></i>' : ""}
        </span>
      </div>
    `;
  });
  messagesContainer.innerHTML = messagesHTML;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show peer connection modal
function showPeerModal() {
  let modal = document.getElementById("peerModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "peerModal";
    modal.className = "modal";
    modal.style.display = "block";
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Peer-to-Peer Connect</h5>
            <button type="button" class="btn-close" id="closePeerModal"></button>
          </div>
          <div class="modal-body" id="peerModalBody"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = "block";
  }
  const body = document.getElementById("peerModalBody");
  body.innerHTML = `
    <div class="mb-3">
      <button class="btn btn-primary w-100" id="createOfferBtn">Create Offer</button>
    </div>
    <div class="mb-3">
      <textarea class="form-control" id="offerInput" rows="3" placeholder="Paste offer or answer here"></textarea>
    </div>
    <div class="d-grid gap-2">
      <button class="btn btn-success" id="receiveOfferBtn">Receive Offer</button>
      <button class="btn btn-info" id="finalizeBtn">Finalize Connection</button>
    </div>
    <div class="mt-3" id="peerStatus"></div>
  `;

  document.getElementById("createOfferBtn").onclick = async () => {
    await webrtc.createOffer((offer) => {
      document.getElementById("offerInput").value = offer;
      document.getElementById("peerStatus").innerText =
        "Share this offer with your peer.";
    });
  };

  document.getElementById("receiveOfferBtn").onclick = async () => {
    const offer = document.getElementById("offerInput").value;
    await webrtc.receiveOffer(offer, (answer) => {
      document.getElementById("offerInput").value = answer;
      document.getElementById("peerStatus").innerText =
        "Send this answer back to your peer.";
    });
  };

  document.getElementById("finalizeBtn").onclick = async () => {
    const answer = document.getElementById("offerInput").value;
    await webrtc.finalizeConnection(answer);
    document.getElementById("peerStatus").innerText =
      "Peer connection established!";
    modal.style.display = "none";
  };

  document.getElementById("closePeerModal").onclick = () => {
    modal.style.display = "none";
  };
}

// Start the application
initApp();

// Listen for peer messages and update chat UI
webrtc.setOnMessage(async (msg) => {
  try {
    if (msg === "__CONNECTED__") return;

    const data = JSON.parse(msg);
    if (data.type === "user-info") {
      // Save the peer user info to your DB
      await auth.db.saveUser(data.user);
      // Create or open a chat with this user
      let conversation = await chat.getConversationWith(data.user.phone);
      if (!conversation) {
        conversation = await chat.createConversation(data.user.phone);
      }
      openChat(conversation.id, "conversation");
      return;
    }

    // Handle incoming chat messages
    const { chatId, content, sender } = JSON.parse(msg);
    await chat.sendMessage(chatId, content); // Save to local DB

    // If the user is currently viewing this chat, update the UI
    const chatContainer = document.getElementById("chatContainer");
    if (chatContainer && chatContainer.innerHTML.includes(chatId)) {
      const updatedMessages = await chat.db.getMessages(chatId);
      renderMessages(updatedMessages);
    }
  } catch (e) {
    console.error("Peer message error:", e);
  }
});

// Helper for Chat class: getConversationWith
// Add this method to your Chat class (in chat.js):
// async getConversationWith(phone) {
//   const conversations = await this.getConversations();
//   return conversations.find(conv => conv.participants.includes(phone));
// }
