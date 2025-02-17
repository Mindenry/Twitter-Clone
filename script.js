// Storage Manager for persistent data
class StorageManager {
  static saveTweets(tweets) {
    localStorage.setItem("tweets", JSON.stringify(tweets));
  }

  static loadTweets() {
    return JSON.parse(localStorage.getItem("tweets")) || [];
  }

  static saveUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
  }

  static loadUser() {
    return JSON.parse(localStorage.getItem("currentUser"));
  }
}

// User class
class User {
  constructor(name, username, bio = "") {
    this.name = name;
    this.username = username;
    this.bio = bio;
    this.followers = 0;
    this.following = 0;
    this.profileImage = null;
    this.bannerImage = null;
  }
}

// Tweet Manager class
class TweetManager {
  constructor() {
    this.tweets = StorageManager.loadTweets();
    this.notifications = [];
    this.currentUser = new User(
      "ผู้ใช้ตัวอย่าง",
      "example_user",
      "นี่คือตัวอย่างไบโอ"
    );
    this.tweetFeed = document.querySelector(".tweet-feed");
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupNavigationEvents();
    this.loadInitialTweets();
    this.setupProfileSection();
    this.createSampleNotifications();
  }

  setupEventListeners() {
    // Setup compose tweet section
    const composeTweet = document.createElement("div");
    composeTweet.className = "compose-tweet";
    composeTweet.innerHTML = `
                    <div class="avatar"></div>
                    <div class="tweet-input">
                        <textarea placeholder="คุณกำลังคิดอะไรอยู่?"></textarea>
                        <div class="tweet-actions">
                            <div class="tweet-tools">
                                <i class="far fa-image"></i>
                                <i class="far fa-smile"></i>
                                <i class="fas fa-poll"></i>
                            </div>
                            <button class="tweet-btn">ทวีต</button>
                        </div>
                    </div>
                `;

    this.tweetFeed.insertBefore(composeTweet, this.tweetFeed.firstChild);
    this.tweetTextarea = composeTweet.querySelector("textarea");
    this.tweetBtn = composeTweet.querySelector(".tweet-btn");

    // Add tweet button event listener
    this.tweetBtn.addEventListener("click", () => this.createTweet());

    // Add character count listener
    this.tweetTextarea.addEventListener("input", () =>
      this.updateCharacterCount()
    );
  }

  setupNavigationEvents() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = ["home", "explore", "notifications", "profile"];

    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        // Hide all sections
        sections.forEach((section) => {
          const element = document.getElementById(`${section}Section`);
          if (element) {
            element.style.display = "none";
          }
        });

        // Remove active class from all nav items
        navItems.forEach((navItem) => navItem.classList.remove("active"));

        // Add active class to clicked item
        item.classList.add("active");

        // Show appropriate section
        const sectionMap = {
          หน้าแรก: "homeSection",
          สำรวจ: "exploreSection",
          การแจ้งเตือน: "notificationsSection",
          โปรไฟล์: "profileSection",
        };

        const sectionName = item.querySelector("span").textContent;
        const sectionId = sectionMap[sectionName];

        if (sectionId) {
          document.getElementById(sectionId).style.display = "block";
          if (sectionId === "exploreSection") this.loadExploreContent();
          if (sectionId === "notificationsSection") this.loadNotifications();
          if (sectionId === "profileSection") this.loadProfile();
        }
      });
    });
  }

  createTweet(content = null) {
    const tweetContent = content || this.tweetTextarea.value.trim();
    if (!tweetContent) return;

    const tweet = {
      id: Date.now(),
      content: tweetContent,
      user: this.currentUser,
      timestamp: new Date(),
      likes: 0,
      retweets: 0,
      replies: 0,
      isLiked: false,
      isRetweeted: false,
    };

    this.tweets.unshift(tweet);
    StorageManager.saveTweets(this.tweets);
    this.renderTweet(tweet);

    if (this.tweetTextarea) {
      this.tweetTextarea.value = "";
      this.updateCharacterCount();
    }

    // Check for mentions and create notifications
    if (tweetContent.includes("@")) {
      const mentions = tweetContent.match(/@(\w+)/g);
      if (mentions) {
        mentions.forEach((username) => {
          this.createNotification("mention", username.slice(1));
        });
      }
    }
  }

  renderTweet(tweet) {
    const tweetElement = document.createElement("div");
    tweetElement.className = "tweet new-tweet";
    tweetElement.dataset.tweetId = tweet.id;

    tweetElement.innerHTML = `
                    <div class="avatar"></div>
                    <div class="tweet-content">
                        <div class="tweet-header">
                            <span class="tweet-name">${tweet.user.name}</span>
                            <span class="tweet-username">@${
                              tweet.user.username
                            }</span>
                            <span class="tweet-time">· ${this.getFormattedTimestamp(
                              tweet.timestamp
                            )}</span>
                        </div>
                        <div class="tweet-text">${this.formatTweetContent(
                          tweet.content
                        )}</div>
                        <div class="tweet-buttons">
                            <div class="tweet-button" data-action="reply">
                                <i class="far fa-comment"></i>
                                <span>${tweet.replies}</span>
                            </div>
                            <div class="tweet-button" data-action="retweet">
                                <i class="fas fa-retweet"></i>
                                <span>${tweet.retweets}</span>
                            </div>
                            <div class="tweet-button" data-action="like">
                                <i class="far fa-heart"></i>
                                <span>${tweet.likes}</span>
                            </div>
                            <div class="tweet-button" data-action="share">
                                <i class="far fa-share-square"></i>
                            </div>
                        </div>
                    </div>
                `;

    // Setup tweet interactions
    const buttons = tweetElement.querySelectorAll(".tweet-button");
    buttons.forEach((button) => {
      button.addEventListener("click", () =>
        this.handleTweetAction(button, tweet)
      );
    });

    if (this.tweetFeed) {
      this.tweetFeed.insertBefore(tweetElement, this.tweetFeed.firstChild);
    }
  }

  formatTweetContent(content) {
    return content
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
      .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  }

  getFormattedTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000; // difference in seconds

    if (diff < 60) return "เมื่อสักครู่";
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString("th-TH");
  }

  updateCharacterCount() {
    const maxLength = 280;
    const remainingChars =
      maxLength - (this.tweetTextarea ? this.tweetTextarea.value.length : 0);

    let counterElement = document.querySelector(".character-counter");
    if (!counterElement) {
      counterElement = document.createElement("div");
      counterElement.className = "character-counter";
      this.tweetTextarea.parentElement.appendChild(counterElement);
    }

    counterElement.textContent = remainingChars;
    counterElement.style.color = remainingChars < 20 ? "red" : "inherit";
    this.tweetBtn.disabled = remainingChars < 0;
  }

  loadInitialTweets() {
    // Load sample tweets if no tweets exist
    if (this.tweets.length === 0) {
      const sampleTweets = [
        {
          content: "ยินดีต้อนรับสู่ Twitter Clone! 👋 #Welcome",
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          content: "เริ่มต้นใช้งาน Twitter Clone กันเถอะ! 🚀 #StartHere",
          timestamp: new Date(Date.now() - 7200000),
        },
      ];

      sampleTweets.forEach((tweet) => this.createTweet(tweet.content));
    } else {
      // Render existing tweets
      this.tweets.forEach((tweet) => this.renderTweet(tweet));
    }
  }

  handleTweetAction(button, tweet) {
    const action = button.dataset.action;
    const countElement = button.querySelector("span");
    const icon = button.querySelector("i");

    switch (action) {
      case "like":
        tweet.isLiked = !tweet.isLiked;
        tweet.likes += tweet.isLiked ? 1 : -1;
        icon.classList.toggle("fas");
        icon.classList.toggle("far");
        button.style.color = tweet.isLiked ? "#ff1493" : "";
        countElement.textContent = tweet.likes;
        if (tweet.isLiked) {
          this.createNotification("like", tweet.user.username);
        }
        break;

      case "retweet":
        tweet.isRetweeted = !tweet.isRetweeted;
        tweet.retweets += tweet.isRetweeted ? 1 : -1;
        button.style.color = tweet.isRetweeted ? "#17bf63" : "";
        countElement.textContent = tweet.retweets;
        if (tweet.isRetweeted) {
          this.createNotification("retweet", tweet.user.username);
        }
        break;

      case "reply":
        this.showReplyModal(tweet);
        break;
    }

    StorageManager.saveTweets(this.tweets);
  }

  createNotification(type, username) {
    const notification = {
      id: Date.now(),
      type,
      username,
      timestamp: new Date(),
      isRead: false,
    };

    this.notifications.unshift(notification);
    this.updateNotificationBadge();
  }

  createSampleNotifications() {
    this.createNotification("like", "user123");
    this.createNotification("retweet", "another_user");
    this.createNotification("mention", "friend");
  }

  loadNotifications() {
    const container = document.querySelector(".notifications-container");
    if (!container) return;

    container.innerHTML = "";

    this.notifications.forEach((notification) => {
      const element = document.createElement("div");
      element.className = "notification";

      const notificationTypes = {
        like: { icon: "fa-heart", text: "ถูกใจทวีตของคุณ" },
        retweet: { icon: "fa-retweet", text: "รีทวีตทวีตของคุณ" },
        mention: { icon: "fa-at", text: "กล่าวถึงคุณในทวีต" },
      };

      const { icon, text } = notificationTypes[notification.type];

      element.innerHTML = `
                        <div class="notification-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="notification-content">
                            <div>@${notification.username} ${text}</div>
                            <div class="tweet-time">${this.getFormattedTimestamp(
                              notification.timestamp
                            )}</div>
                        </div>
                    `;

      container.appendChild(element);
    });
  }

  updateNotificationBadge() {
    const unreadCount = this.notifications.filter((n) => !n.isRead).length;
    const notificationNav = document.querySelector(
      ".nav-item i.fa-bell"
    ).parentElement;

    let badge = notificationNav.querySelector(".notification-badge");
    if (unreadCount > 0) {
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "notification-badge";
        badge.style.cssText = `
                            background-color: var(--twitter-blue);
                            color: white;
                            border-radius: 50%;
                            padding: 2px 6px;
                            font-size: 12px;
                            position: absolute;
                            top: -5px;
                            right: -5px;
                        `;
        notificationNav.style.position = "relative";
        notificationNav.appendChild(badge);
      }
      badge.textContent = unreadCount;
    } else if (badge) {
      badge.remove();
    }
  }

  setupProfileSection() {
    const profileContent = document.querySelector(".profile-content");
    if (!profileContent) return;

    profileContent.innerHTML = `
                    <div class="profile-header">
                        <div class="profile-banner"></div>
                        <div class="profile-avatar"></div>
                        <button class="profile-edit-btn">แก้ไขโปรไฟล์</button>
                    </div>
                    <div class="profile-info">
                        <div class="profile-name">${this.currentUser.name}</div>
                        <div class="profile-username">@${this.currentUser.username}</div>
                        <div class="profile-bio">${this.currentUser.bio}</div>
                        <div class="profile-stats">
                            <div class="stat-item">
                                <span class="stat-number">${this.currentUser.following}</span> กำลังติดตาม
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">${this.currentUser.followers}</span> ผู้ติดตาม
                            </div>
                        </div>
                    </div>
                    <div class="profile-tweets"></div>
                    <div class="user-tweets"></div>
                `;

    // Setup profile edit button
    const editBtn = profileContent.querySelector(".profile-edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => this.showProfileEditModal());
    }

    // Load user's tweets
    this.loadUserTweets();
  }

  loadUserTweets() {
    const userTweets = document.querySelector(".user-tweets");
    if (!userTweets) return;

    userTweets.innerHTML = "";
    const filteredTweets = this.tweets.filter(
      (tweet) => tweet.user.username === this.currentUser.username
    );
    filteredTweets.forEach((tweet) => this.renderTweet(tweet));
  }

  showProfileEditModal() {
    let modal = document.getElementById("profileModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "profileModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
                    <div class="modal-content">
                        <div style="position: relative;">
                            <h2 style="margin-bottom: 20px;">แก้ไขโปรไฟล์</h2>
                            <button class="close-modal" style="position: absolute; right: 0; top: 0; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
                            <div style="margin-bottom: 15px;">
                                <label>ชื่อ</label>
                                <input type="text" value="${this.currentUser.name}" class="edit-name" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label>ไบโอ</label>
                                <textarea class="edit-bio" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px;">${this.currentUser.bio}</textarea>
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label>รูปโปรไฟล์</label>
                                <input type="file" accept="image/*" class="edit-avatar">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label>รูปพื้นหลัง</label>
                                <input type="file" accept="image/*" class="edit-banner">
                            </div>
                            <button class="save-profile" style="background: var(--twitter-blue); color: white; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer;">บันทึก</button>
                        </div>
                    </div>
                `;

    modal.style.display = "block";

    // Setup close button
    const closeBtn = modal.querySelector(".close-modal");
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });

    // Setup save button
    const saveBtn = modal.querySelector(".save-profile");
    saveBtn.addEventListener("click", () => {
      const formData = {
        name: modal.querySelector(".edit-name").value,
        bio: modal.querySelector(".edit-bio").value,
        avatar: modal.querySelector(".edit-avatar").files[0],
        banner: modal.querySelector(".edit-banner").files[0],
      };

      this.updateProfile(formData);
      modal.style.display = "none";
    });

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  showReplyModal(tweet) {
    let modal = document.getElementById("replyModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "replyModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
                    <div class="modal-content">
                        <div style="position: relative;">
                            <h2 style="margin-bottom: 20px;">ตอบกลับ</h2>
                            <button class="close-modal" style="position: absolute; right: 0; top: 0; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
                            <div class="original-tweet" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 15px;">
                                <div class="tweet-header">
                                    <span class="tweet-name">${tweet.user.name}</span>
                                    <span class="tweet-username">@${tweet.user.username}</span>
                                </div>
                                <div class="tweet-text">${tweet.content}</div>
                            </div>
                            <textarea class="reply-input" placeholder="ทวีตการตอบกลับของคุณ" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
                            <button class="send-reply" style="background: var(--twitter-blue); color: white; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; margin-top: 10px;">ตอบกลับ</button>
                        </div>
                    </div>
                `;

    modal.style.display = "block";

    const closeBtn = modal.querySelector(".close-modal");
    const replyBtn = modal.querySelector(".send-reply");
    const replyInput = modal.querySelector(".reply-input");

    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });

    replyBtn.addEventListener("click", () => {
      const replyContent = replyInput.value.trim();
      if (replyContent) {
        tweet.replies++;
        this.createTweet(`@${tweet.user.username} ${replyContent}`);
        modal.style.display = "none";

        // Update reply count in UI
        const tweetElement = document.querySelector(
          `[data-tweet-id="${tweet.id}"]`
        );
        if (tweetElement) {
          const replyCount = tweetElement.querySelector(
            '[data-action="reply"] span'
          );
          replyCount.textContent = tweet.replies;
        }

        StorageManager.saveTweets(this.tweets);
      }
    });

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  loadExploreContent() {
    const container = document.querySelector(".explore-section");
    if (!container) return;

    container.innerHTML = "";

    const trendingTopics = [
      { topic: "#Thailand", tweets: "125K", category: "ประเทศไทย" },
      { topic: "โควิด19", tweets: "89.5K", category: "สุขภาพ" },
      { topic: "#Bitcoin", tweets: "258K", category: "การเงิน" },
      { topic: "หวย", tweets: "45.2K", category: "บันเทิง" },
      { topic: "#K_pop", tweets: "1.2M", category: "เพลง" },
    ];

    trendingTopics.forEach((topic) => {
      const element = document.createElement("div");
      element.className = "trending-topic";
      element.innerHTML = `
                        <div class="trend-category">กำลังเป็นที่นิยมใน${topic.category}</div>
                        <div class="trend-name">${topic.topic}</div>
                        <div class="trend-tweets">${topic.tweets} ทวีต</div>
                    `;
      container.appendChild(element);
    });
  }

  updateProfile(formData) {
    this.currentUser.name = formData.name;
    this.currentUser.bio = formData.bio;

    if (formData.avatar) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentUser.profileImage = e.target.result;
        const avatarElements = document.querySelectorAll(".profile-avatar");
        avatarElements.forEach((el) => {
          el.style.backgroundImage = `url(${e.target.result})`;
        });
      };
      reader.readAsDataURL(formData.avatar);
    }

    if (formData.banner) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentUser.bannerImage = e.target.result;
        const bannerElements = document.querySelectorAll(".profile-banner");
        bannerElements.forEach((el) => {
          el.style.backgroundImage = `url(${e.target.result})`;
        });
      };
      reader.readAsDataURL(formData.banner);
    }

    StorageManager.saveUser(this.currentUser);
    this.setupProfileSection();
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  // Create and initialize TweetManager
  const tweetManager = new TweetManager();

  // Add dark mode toggle functionality if needed
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem(
        "darkMode",
        document.body.classList.contains("dark-mode")
      );
    });

    // Check for saved dark mode preference
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark-mode");
    }
  }
});

class ProfileManager {
  constructor() {
    this.currentUser = this.loadUserData() || this.createDefaultUser();
    this.initializeElements();
    this.setupEventListeners();
    this.updateProfileUI();
  }

  createDefaultUser() {
    return {
      name: "ผู้ใช้ตัวอย่าง",
      username: "example_user",
      bio: "ยินดีต้อนรับสู่โปรไฟล์ของฉัน",
      location: "กรุงเทพมหานคร",
      joinDate: new Date().toISOString(),
      followers: 0,
      following: 0,
      avatarUrl: null,
      bannerUrl: null,
      tweets: [],
      likes: [],
      media: [],
      replies: [],
    };
  }

  loadUserData() {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData) : null;
  }

  saveUserData() {
    localStorage.setItem("userData", JSON.stringify(this.currentUser));
  }

  initializeElements() {
    // Profile elements
    this.profileBanner = document.getElementById("profileBanner");
    this.profileAvatar = document.getElementById("profileAvatar");
    this.displayName = document.getElementById("displayName");
    this.username = document.getElementById("username");
    this.userBio = document.getElementById("userBio");
    this.userLocation = document.getElementById("userLocation");
    this.joinDate = document.getElementById("joinDate");
    this.followingCount = document.getElementById("followingCount");
    this.followersCount = document.getElementById("followersCount");

    // Content tabs
    this.contentTabs = document.querySelectorAll(".profile-content-tabs .tab");
    this.userTweets = document.getElementById("userTweets");

    // Edit profile elements
    this.editProfileBtn = document.getElementById("editProfileBtn");
    this.editProfileModal = document.getElementById("editProfileModal");
    this.editProfileForm = document.getElementById("editProfileForm");

    // File inputs
    this.avatarInput = document.getElementById("avatarInput");
    this.bannerInput = document.getElementById("bannerInput");
  }

  setupEventListeners() {
    // Profile edit button
    this.editProfileBtn.addEventListener("click", () =>
      this.openEditProfileModal()
    );

    // File input handlers
    this.avatarInput.addEventListener("change", (e) =>
      this.handleImageUpload(e, "avatar")
    );
    this.bannerInput.addEventListener("change", (e) =>
      this.handleImageUpload(e, "banner")
    );

    // Edit profile form
    this.editProfileForm.addEventListener("submit", (e) =>
      this.handleProfileUpdate(e)
    );

    // Content tabs
    this.contentTabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab));
    });

    // Character counters for edit form
    const textInputs = this.editProfileForm.querySelectorAll(
      'input[type="text"], textarea'
    );
    textInputs.forEach((input) => {
      input.addEventListener("input", () => this.updateCharacterCount(input));
    });

    // Close modal button
    const closeModalBtn = this.editProfileModal.querySelector(".close-modal");
    closeModalBtn.addEventListener("click", () => this.closeEditProfileModal());
  }

  updateProfileUI() {
    // Update profile images
    if (this.currentUser.avatarUrl) {
      this.profileAvatar.src = this.currentUser.avatarUrl;
    }
    if (this.currentUser.bannerUrl) {
      this.profileBanner.src = this.currentUser.bannerUrl;
    }

    // Update text content
    this.displayName.textContent = this.currentUser.name;
    this.username.textContent = `@${this.currentUser.username}`;
    this.userBio.textContent =
      this.currentUser.bio || "ยังไม่ได้เพิ่มชีวประวัติ";
    this.userLocation.textContent =
      this.currentUser.location || "ไม่ระบุตำแหน่ง";

    // Format and display join date
    const joinDate = new Date(this.currentUser.joinDate);
    const options = { year: "numeric", month: "long" };
    this.joinDate.textContent = joinDate.toLocaleDateString("th-TH", options);

    // Update counts
    this.followingCount.textContent =
      this.currentUser.following.toLocaleString();
    this.followersCount.textContent =
      this.currentUser.followers.toLocaleString();

    // Load default tab content
    this.loadTweetsTab();
  }

  handleImageUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      alert("กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      alert("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      if (type === "avatar") {
        this.currentUser.avatarUrl = imageUrl;
        this.profileAvatar.src = imageUrl;
      } else {
        this.currentUser.bannerUrl = imageUrl;
        this.profileBanner.src = imageUrl;
      }
      this.saveUserData();
    };
    reader.readAsDataURL(file);
  }

  handleProfileUpdate(event) {
    event.preventDefault();

    const formData = new FormData(this.editProfileForm);
    const updates = {
      name: formData.get("editName"),
      bio: formData.get("editBio"),
      location: formData.get("editLocation"),
    };

    // Validate input lengths
    if (updates.name.length > 50) {
      alert("ชื่อต้องไม่เกิน 50 ตัวอักษร");
      return;
    }
    if (updates.bio.length > 160) {
      alert("ชีวประวัติต้องไม่เกิน 160 ตัวอักษร");
      return;
    }
    if (updates.location.length > 30) {
      alert("ตำแหน่งต้องไม่เกิน 30 ตัวอักษร");
      return;
    }

    // Update user data
    Object.assign(this.currentUser, updates);
    this.saveUserData();
    this.updateProfileUI();
    this.closeEditProfileModal();
  }

  openEditProfileModal() {
    // Populate form with current values
    const form = this.editProfileForm;
    form.elements.editName.value = this.currentUser.name;
    form.elements.editBio.value = this.currentUser.bio;
    form.elements.editLocation.value = this.currentUser.location;

    // Update character counts
    Array.from(form.elements).forEach((element) => {
      if (
        element.type === "text" ||
        element.tagName.toLowerCase() === "textarea"
      ) {
        this.updateCharacterCount(element);
      }
    });

    this.editProfileModal.style.display = "block";
  }

  closeEditProfileModal() {
    this.editProfileModal.style.display = "none";
  }

  updateCharacterCount(input) {
    const maxLength = input.maxLength;
    const currentLength = input.value.length;
    const counterElement =
      input.parentElement.querySelector(".character-count");
    if (counterElement) {
      counterElement.textContent = `${currentLength}/${maxLength}`;
      counterElement.style.color =
        currentLength >= maxLength ? "red" : "#536471";
    }
  }

  switchTab(selectedTab) {
    // Update active tab styling
    this.contentTabs.forEach((tab) => {
      tab.classList.remove("active");
    });
    selectedTab.classList.add("active");

    // Load appropriate content
    const tabType = selectedTab.dataset.tab;
    switch (tabType) {
      case "tweets":
        this.loadTweetsTab();
        break;
      case "replies":
        this.loadRepliesTab();
        break;
      case "media":
        this.loadMediaTab();
        break;
      case "likes":
        this.loadLikesTab();
        break;
    }
  }

  loadTweetsTab() {
    this.userTweets.innerHTML = "";
    if (this.currentUser.tweets.length === 0) {
      this.showEmptyState("ยังไม่มีทวีต");
      return;
    }
    this.currentUser.tweets.forEach((tweet) => this.renderTweet(tweet));
  }

  loadRepliesTab() {
    this.userTweets.innerHTML = "";
    if (this.currentUser.replies.length === 0) {
      this.showEmptyState("ยังไม่มีการตอบกลับ");
      return;
    }
    this.currentUser.replies.forEach((reply) => this.renderTweet(reply, true));
  }

  loadMediaTab() {
    this.userTweets.innerHTML = "";
    if (this.currentUser.media.length === 0) {
      this.showEmptyState("ยังไม่มีสื่อ");
      return;
    }
    this.renderMediaGrid(this.currentUser.media);
  }

  loadLikesTab() {
    this.userTweets.innerHTML = "";
    if (this.currentUser.likes.length === 0) {
      this.showEmptyState("ยังไม่มีทวีตที่ถูกใจ");
      return;
    }
    this.currentUser.likes.forEach((tweet) => this.renderTweet(tweet));
  }

  showEmptyState(message) {
    this.userTweets.innerHTML = `
          <div class="empty-state">
              <i class="far fa-comment-alt"></i>
              <p>${message}</p>
          </div>
      `;
  }

  renderTweet(tweet, isReply = false) {
    const tweetElement = document.createElement("div");
    tweetElement.className = "tweet";
    if (isReply) {
      tweetElement.classList.add("tweet-reply");
    }

    tweetElement.innerHTML = `
          <div class="avatar">
              <img src="${
                this.currentUser.avatarUrl || "default-avatar.jpg"
              }" alt="Profile Avatar">
          </div>
          <div class="tweet-content">
              <div class="tweet-header">
                  <span class="tweet-name">${this.currentUser.name}</span>
                  <span class="tweet-username">@${
                    this.currentUser.username
                  }</span>
                  <span class="tweet-time">· ${this.formatDate(
                    tweet.timestamp
                  )}</span>
              </div>
              ${
                isReply
                  ? `<div class="reply-to">ตอบกลับ @${tweet.replyTo}</div>`
                  : ""
              }
              <div class="tweet-text">${this.formatTweetContent(
                tweet.content
              )}</div>
              ${
                tweet.media
                  ? `<div class="tweet-media"><img src="${tweet.media}" alt="Tweet media"></div>`
                  : ""
              }
              <div class="tweet-actions">
                  <button class="tweet-action reply"><i class="far fa-comment"></i> ${
                    tweet.replies || 0
                  }</button>
                  <button class="tweet-action retweet"><i class="fas fa-retweet"></i> ${
                    tweet.retweets || 0
                  }</button>
                  <button class="tweet-action like"><i class="far fa-heart"></i> ${
                    tweet.likes || 0
                  }</button>
                  <button class="tweet-action share"><i class="far fa-share-square"></i></button>
              </div>
          </div>
      `;

    this.userTweets.appendChild(tweetElement);
  }

  renderMediaGrid(mediaItems) {
    const gridContainer = document.createElement("div");
    gridContainer.className = "media-grid";

    mediaItems.forEach((media) => {
      const mediaElement = document.createElement("div");
      mediaElement.className = "media-item";
      mediaElement.innerHTML = `<img src="${media.url}" alt="Media content">`;
      gridContainer.appendChild(mediaElement);
    });

    this.userTweets.appendChild(gridContainer);
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000; // difference in seconds

    if (diff < 60) return "เมื่อสักครู่";
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  formatTweetContent(content) {
    return content
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
      .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  }
}

// Initialize the profile manager when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
  const profileManager = new ProfileManager();
});
