import express, { json } from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import aws from 'aws-sdk';
import Blog from './Schema/Blog.js'; // Adjust the path as needed

// Schema imports
import User from './Schema/User.js';

const server = express();
let PORT = 3000;

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());
server.use(cors());

mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true,
});

// Setting up S3 bucket
const s3 = new aws.S3({
    region: 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

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

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token === null) {
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

const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);

    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname,
    };
};

const generateUsername = async (email) => {
    let username = email.split('@')[0];

    let isUsernameNotUnique = await User.exists({ 'personal_info.username': username }).then(
        (result) => result
    );

    isUsernameNotUnique ? (username += nanoid().substring(0, 5)) : '';

    return username;
};

// Upload image URL root
server.get('/get-upload-url', (req, res) => {
    generateUploadURL()
        .then((url) => res.status(200).json({ uploadURL: url }))
        .catch((err) => {
            console.log(err.message);
            return res.status(500).json({ error: err.message });
        });
});

// User signup
server.post('/signup', (req, res) => {
    let { fullname, email, password } = req.body;

    // Validating the data from frontend
    if (fullname.length < 3) {
        return res.status(403).json({ error: 'Fullname must be at least 3 letters long' });
    }
    if (!email.length) {
        return res.status(403).json({ error: 'Enter email' });
    }
    if (!emailRegex.test(email)) {
        return res.status(403).json({ error: 'Email is invalid' });
    }
    if (!passwordRegex.test(password)) {
        return res.status(403).json({
            error:
                'Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase',
        });
    }

    bcrypt.hash(password, 10, async (err, hashed_password) => {
        let username = await generateUsername(email);

        let user = new User({
            personal_info: { fullname, email, password: hashed_password, username },
        });

        user
            .save()
            .then((u) => {
                return res.status(200).json(formatDatatoSend(u));
            })
            .catch((err) => {
                if (err.code == 11000) {
                    return res.status(500).json({ error: 'Email already exists' });
                }

                return res.status(500).json({ error: err.message });
            });
    });
});

// User signin
server.post('/signin', (req, res) => {
    let { email, password } = req.body;

    User.findOne({ 'personal_info.email': email })
        .then((user) => {
            if (!user) {
                return res.status(403).json({ error: 'Email not found' });
            }

            bcrypt.compare(password, user.personal_info.password, (err, result) => {
                if (err) {
                    return res.status(403).json({ error: 'Error occurred while login. Please try again' });
                }

                if (!result) {
                    return res.status(403).json({ error: 'Incorrect Password' });
                } else {
                    return res.status(200).json(formatDatatoSend(user));
                }
            });
        })
        .catch((err) => {
            console.log(err.message);
            return res.status(500).json({ error: 'err.message' });
        });
});

// Get latest blogs
server.get('/latest-blogs', (req, res) => {
    let { page = 1 } = req.body;
    let maxLimit = 5;

    Blog.find({ draft: false })
        .populate('author', 'personal_info.profile_img personal_info.username personal_info.fullname -_id')
        .sort({ publishedAt: -1 })
        .select('blog_id title des banner activity tags publishedAt -_id')
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then((blogs) => {
            return res.status(200).json({ blogs });
        })
        .catch((err) => {
            return res.status(500).json({ error: err.message });
        });
});

// Get the count of all latest blogs
server.get('/all-latest-blogs-count', (req, res) => {
    Blog.countDocuments({ draft: false })
        .then((count) => {
            return res.status(200).json({ totalDocs: count });
        })
        .catch((err) => {
            console.log(err.message);
            return res.status(500).json({ error: err.message });
        });
});

// Get trending blogs
server.get('/trending-blogs', (req, res) => {
    let maxLimit = 5;

    Blog.find({ draft: false })
        .populate('author', 'personal_info.profile_img personal_info.username personal_info.fullname -_id')
        .sort({ 'activity.total_read': -1, 'activity.total_likes': -1, publishedAt: -1 })
        .select('blog_id title publishedAt -_id')
        .limit(maxLimit)
        .then((blogs) => {
            return res.status(200).json({ blogs });
        })
        .catch((err) => {
            return res.status(500).json({ error: err.message });
        });
});

// Search for blogs
server.post('/search-blogs', (req, res) => {
    let { tag, query, author, page = 1 } = req.body;
    let findQuery = { draft: false };

    if (tag) {
        findQuery.tags = tag;
    } else if (query) {
        findQuery.title = new RegExp(query, 'i');
    } else if (author) {
        findQuery.author = author;
    }

    let maxLimit = 5;

    Blog.find(findQuery)
        .populate('author', 'personal_info.profile_img personal_info.username personal_info.fullname -_id')
        .sort({ 'activity.total_read': -1, 'activity.total_likes': -1, publishedAt: -1 })
        .select('blog_id title des banner activity tags publishedAt -_id')
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then((blogs) => {
            return res.status(200).json({ blogs });
        })
        .catch((err) => {
            return res.status(500).json({ error: err.message });
        });
});

// Count search blogs
server.post('/search-blogs-count', (req, res) => {
    let { tag, author, query } = req.body;

    let findQuery = {};

    if (tag) {
        findQuery.tags = tag;
    } else if (query) {
        findQuery.title = new RegExp(query, 'i');
    } else if (author) {
        findQuery.author = author;
    }

    Blog.countDocuments(findQuery)
        .then((count) => {
            return res.status(200).json({ totalDocs: count });
        })
        .catch((err) => {
            console.log(err.message);
            return res.status(500).json({ error: err.message });
        });
});

// Search for users
server.post('/search-users', (req, res) => {
    let { query } = req.body;

    User.find({ 'personal_info.username': new RegExp(query, 'i') })
        .limit(50)
        .select('personal_info.fullname personal_info.username personal_info.profile_img')
        .then((users) => {
            return res.status(200).json({ users });
        })
        .catch((err) => {
            return res.status(500).json({ error: err.message });
        });
});

// Server listener
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
