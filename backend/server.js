import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",").map(v => v.trim()) : true,
  credentials: true
}));
app.use(express.json({ limit: "4mb" }));

// ---------- MongoDB schemas ----------
// Exactly two collections: users and posts.

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 24 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 }
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 300 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const likeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true }
}, { _id: false });

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  author: {
    name: { type: String, required: true },
    username: { type: String, required: true }
  },
  text: { type: String, trim: true, maxlength: 2000, default: "" },
  image: { type: String, default: "" },
  likes: { type: [likeSchema], default: [] },
  comments: { type: [commentSchema], default: [] }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required." });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please login again." });
  }
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email
  };
}

function publicPost(post, currentUserId) {
  const p = post.toObject ? post.toObject() : post;
  return {
    ...p,
    likeCount: p.likes.length,
    commentCount: p.comments.length,
    likedByMe: Boolean(currentUserId && p.likes.some(l => l.userId.toString() === currentUserId.toString())),
    isOwner: Boolean(currentUserId && p.userId.toString() === currentUserId.toString())
  };
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Neural Social API" });
});

// ---------- Auth ----------

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return res.status(400).json({ message: "Username must be 3–24 characters using letters, numbers or underscore." });
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
    }

    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });
    if (existing) return res.status(409).json({ message: "Email or username already exists." });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Account created successfully.",
      token: signToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: "Login successful.",
      token: signToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to login." });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user: sanitizeUser(user) });
});

// ---------- Posts ----------

app.get("/api/posts", async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "5", 10), 1), 20);
    const total = await Post.countDocuments();
    const posts = await Post.find().sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const userId = req.user?.id;
    res.json({
      posts: posts.map(post => publicPost(post, userId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load posts." });
  }
});

app.post("/api/posts", auth, async (req, res) => {
  try {
    const { text = "", image = "" } = req.body;
    const cleanText = String(text).trim();

    if (!cleanText && !image) {
      return res.status(400).json({ message: "Add some text or an image before posting." });
    }
    if (cleanText.length > 2000) {
      return res.status(400).json({ message: "Post text cannot exceed 2000 characters." });
    }
    if (image && !String(image).startsWith("data:image/")) {
      return res.status(400).json({ message: "Invalid image format." });
    }
    if (image && image.length > 3_000_000) {
      return res.status(400).json({ message: "Image is too large. Please choose a smaller image." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const post = await Post.create({
      userId: user._id,
      author: { name: user.name, username: user.username },
      text: cleanText,
      image: image || ""
    });

    res.status(201).json({ post: publicPost(post, user._id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to create post." });
  }
});

app.delete("/api/posts/:id", auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) return res.status(404).json({ message: "Post not found or not owned by you." });

    await post.deleteOne();
    res.json({ message: "Post deleted." });
  } catch {
    res.status(400).json({ message: "Invalid post id." });
  }
});

app.post("/api/posts/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const index = post.likes.findIndex(l => l.userId.toString() === req.user.id);
    if (index >= 0) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push({ userId: req.user.id, username: req.user.username });
    }
    await post.save();

    res.json({
      likeCount: post.likes.length,
      likedByMe: index < 0,
      likedBy: post.likes
    });
  } catch {
    res.status(400).json({ message: "Unable to update like." });
  }
});

app.post("/api/posts/:id/comments", auth, async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Comment cannot be empty." });
    if (text.length > 300) return res.status(400).json({ message: "Comment cannot exceed 300 characters." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    post.comments.push({
      userId: req.user.id,
      username: req.user.username,
      text
    });
    await post.save();

    const comment = post.comments[post.comments.length - 1];
    res.status(201).json({
      comment,
      commentCount: post.comments.length
    });
  } catch {
    res.status(400).json({ message: "Unable to add comment." });
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Neural Social API running on port ${PORT}`));
  })
  .catch(error => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
