import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  return null;
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      photoURL: user.photoURL || '',
    },
    process.env.JWT_SECRET || 'altru_secret_key',
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, photoURL, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    const db = getDB();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      photoURL:
        photoURL?.trim() ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      password: hashedPassword,
      role: 'volunteer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await usersCollection.insertOne(newUser);
    newUser._id = result.insertedId;

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        photoURL: newUser.photoURL,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to a server error.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const db = getDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'volunteer',
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error.',
    });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { name, email, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google authentication.',
      });
    }

    const db = getDB();
    const usersCollection = db.collection('users');

    let user = await usersCollection.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      // Create new Google user
      const randomPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      const newUser = {
        name: name || 'Google Volunteer',
        email: email.toLowerCase().trim(),
        photoURL:
          photoURL ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        password: hashedPassword,
        authProvider: 'google',
        role: 'volunteer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await usersCollection.insertOne(newUser);
      newUser._id = result.insertedId;
      user = newUser;
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Google login successful!',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'volunteer',
      },
    });
  } catch (error) {
    console.error('[Google Auth Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed.',
    });
  }
});

// GET /api/auth/me (Protected)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      _id: new ObjectId(req.user.id),
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'volunteer',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Get Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.',
    });
  }
});

// PUT /api/auth/profile (Protected - Bonus Feature: Update Profile)
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, photoURL } = req.body;
    const db = getDB();
    const usersCollection = db.collection('users');

    const updateDoc = {
      $set: {
        updatedAt: new Date().toISOString(),
      },
    };

    if (name?.trim()) updateDoc.$set.name = name.trim();
    if (photoURL?.trim()) updateDoc.$set.photoURL = photoURL.trim();

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(req.user.id) },
      updateDoc,
      { returnDocument: 'after' }
    );

    const updatedUser = result;

    // Issue updated token
    const token = generateToken(updatedUser);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      token,
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        photoURL: updatedUser.photoURL,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('[Update Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
    });
  }
});

export default router;

