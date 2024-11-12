import express, { json } from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import aws from 'aws-sdk';

//Scheme 
import Blog from './Schema/Blog.js';
import User from './Schema/User.js';
import Notification from './Schema/Notification.js';
import Comment from "./Schema/Comment.js";

const server = express();
let PORT = process.env.PORT || 3000; // Default to 3000 or use environment variable

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

server.use(express.json());
server.use(cors());

// MongoDB connection
mongoose.connect(process.env.DB_LOCATION, { autoIndex: true })
  .then(() => console.log('Database connected successfully'))
  .catch((err) => console.error('Database connection error:', err));

// AWS S3 Setup
const s3 = new aws.S3({
    region: 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Helper function to generate an S3 upload URL
const generateUploadURL = async () => {
    const date = new Date();
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

    return await s3.getSignedUrlPromise('putObject', {
        Bucket: 'hikeko-app',
        Key: imageName,
        Expires: 1000,
        ContentType: 'image/jpeg',
    });
};

// JWT Verification Middleware
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No access token' });
    }

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Access token is invalid' });
        }

        req.user = user.id;
        next();
    });
};

// User Profile Formatting
const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);

    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname,
    };
};

// Generate Username for Signup
const generateUsername = async (email) => {
    let username = email.split('@')[0];
    let isUsernameNotUnique = await User.exists({ 'personal_info.username': username }).then(
        (result) => result
    );

    if (isUsernameNotUnique) {
        username += nanoid().substring(0, 5);
    }

    return username;
};

// Routes

// Upload image URL (AWS S3)
server.get('/get-upload-url', async (req, res) => {
    try {
        const url = await generateUploadURL();
        res.status(200).json({ uploadURL: url });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// User Signup
server.post('/signup', async (req, res) => {
    const { fullname, email, password } = req.body;

    if (fullname.length < 3) {
        return res.status(403).json({ error: 'Fullname must be at least 3 letters long' });
    }
    if (!email.length || !emailRegex.test(email)) {
        return res.status(403).json({ error: 'Invalid email' });
    }
    if (!passwordRegex.test(password)) {
        return res.status(403).json({
            error: 'Password should be 6-20 characters long with a numeric, lowercase, and uppercase',
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const username = await generateUsername(email);

        const newUser = new User({
            personal_info: { fullname, email, password: hashedPassword, username },
        });

        const savedUser = await newUser.save();
        res.status(200).json(formatDatatoSend(savedUser));
    } catch (err) {
        if (err.code === 11000) {
            return res.status(500).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// User Signin
server.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ 'personal_info.email': email });
        if (!user) {
            return res.status(403).json({ error: 'Email not found' });
        }

        const match = await bcrypt.compare(password, user.personal_info.password);
        if (!match) {
            return res.status(403).json({ error: 'Incorrect Password' });
        }

        res.status(200).json(formatDatatoSend(user));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Error occurred during login' });
    }
});

// Get latest blogs
server.get('/latest-blogs', async (req, res) => {
    const { page = 1, limit = 5 } = req.body;

    try {
        const blogs = await Blog.find({ draft: false })
            .populate('author', 'personal_info.profile_img personal_info.username personal_info.fullname -_id')
            .sort({ publishedAt: -1 })
            .select('blog_id title des banner activity tags publishedAt -_id')
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({ blogs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a blog
server.post('/create-blog', verifyJWT, async (req, res) => {
    const authorId = req.user;
    const { title, des, banner, tags, content, draft } = req.body;

    if (!title) return res.status(403).json({ error: "You must provide a title" });
    if (!draft) {
        if (!des || des.length > 200) return res.status(403).json({ error: "Description is required and under 200 characters" });
        if (!banner) return res.status(403).json({ error: "Banner is required to publish the post" });
        if (!content.blocks || content.blocks.length === 0) return res.status(403).json({ error: "Content is required to publish the post" });
        if (!tags || tags.length > 10) return res.status(403).json({ error: "Provide up to 10 tags" });
    }

    const blog_id = `${title.replace(/[^a-zA-Z0-9]/g, ' ').trim().replace(/\s+/g, "-")}-${nanoid()}`;

    try {
        const newBlog = new Blog({ title, des, banner, content, tags: tags.map(tag => tag.toLowerCase()), author: authorId, blog_id, draft });
        const savedBlog = await newBlog.save();

        const incrementVal = draft ? 0 : 1;
        await User.findByIdAndUpdate(authorId, { $inc: { "account_info.total_posts": incrementVal }, $push: { "blogs": savedBlog._id } });

        res.status(200).json({ id: savedBlog.blog_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get blog by ID (with incrementing read count)
server.post("/get-blog", async (req, res) => {
    const { blog_id } = req.body;

    if (!blog_id) return res.status(400).json({ error: "Blog ID is required" });

    try {
        const blog = await Blog.findOneAndUpdate({ blog_id }, { $inc: { "activity.total_reads": 1 } })
            .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
            .select("title des content banner activity publishedAt blog_id tags");

        if (!blog) return res.status(404).json({ error: "Blog not found" });

        await User.findOneAndUpdate({ "personal_info.username": blog.author.personal_info.username }, { $inc: { "account_info.total_reads": 1 } });

        res.status(200).json({ blog });
    } catch (err) {
        console.error("Error finding/updating blog:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get total documents for pagination (e.g., for blog posts or comments)
server.post('/get-pagination-data', async (req, res) => {
    const { modelName, filter } = req.body; // You can pass the model name and filter parameters to make it dynamic

    if (!modelName) {
        return res.status(400).json({ error: "Model name is required" });
    }

    try {
        // Dynamically select the model
        const Model = mongoose.model(modelName);
        
        // Get the total document count based on the filter (you can add more filters as needed)
        const totalDocs = await Model.countDocuments(filter || {});

        res.status(200).json({ totalDocs });
    } catch (err) {
        console.error("Error fetching pagination data:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Search blogs by tag (excluding the current blog)
server.post('/search-blogs', async (req, res) => {
    const { tag, limit, eliminate_blog } = req.body;

    // Validate inputs
    if (!tag) return res.status(400).json({ error: 'Tag is required' });

    try {
        // Fetch blogs based on tag, excluding the blog with the given ID
        const blogs = await Blog.find({ tags: tag, draft: false, blog_id: { $ne: eliminate_blog } })
            .populate('author', 'personal_info.profile_img personal_info.username personal_info.fullname -_id')
            .limit(limit)
            .select('blog_id title des banner activity publishedAt -_id');

        res.status(200).json({ blogs });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

server.post("/isliked-by-user", (req, res) => {
    const { _id: blogId } = req.body;
    const userId = req.user.id; // Assuming you have user information from middleware or token

    Like.findOne({ blog_id: blogId, user_id: userId })
        .then(like => {
            res.status(200).json({ result: !!like }); // true if like exists, false otherwise
        })
        .catch(err => {
            console.error("Error checking like status:", err);
            res.status(500).json({ error: "Error checking like status" });
        });
});

server.post("/add-comment", verifyJWT, (req, res) => {
    let user_id = req.user;
    let { _id, comment, blog_author } = req.body;
  
    if (!comment.length) {
      return res.status(403).json({ error: "Write something to leave a comment" });
    }
  
    let commentObj = new Comment ({
        blog_id: _id, blog_author, comment, commented_by: user_id,
    })
    commentObj.save().then(commentFile => {
        let { comment, commentedAt, children } = commentFile;
      
        Blog.findOneAndUpdate({ _id }, { $push: { "comments": commentFile._id }, $inc: { "activity.total_comments": 1, "activity.total_parent_comments": 1 } })
          .then(blog => { console.log('New comment created'); });
      
        let notificationObj = {
          type: "comment",
          blog: _id,
          notification_for: blog_author,
          user: user_id,
          comment: commentFile._id
        };
        new Notification(notificationObj).save().then(notification => console.log('new notification created'));

        return res.status(200).json({
            comment,commentedAt, _id: commentFile._id, user_id, children
        })
    })

  })

  server.post("/get-blog-comments", (req, res) => {
    let { blog_id, skip } = req.body;
  
    let maxLimit = 5;
  
    Comment.find({ blog_id, isReply: false })
    .populate("commented_by", "personal_info.username personal_info.fullname personal_info.profile_img")
    .skip(skip)
    .limit(maxLimit)
    .sort({
        commentedAt: -1
    })
    .then(comments => {
        return res.status(200).json(comments); // Fixed variable name
    })
    .catch(err => {
        console.log(err.message);
        return res.status(500).json({ error: err.message });
    });
});

 
// Server listening
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
