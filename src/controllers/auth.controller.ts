import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'jsancfn48nHXO1H8nvc340vd';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mc1m2c190mMJMHC891';

const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' }); // Short-lived (15 mins)
};

const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' }); // Long-lived (7 days)
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(400).json({ error: 'Username or email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email,
      passwordHash,
    });

    res.status(201).json({ 
      message: 'User registered successfully!', 
      userId: newUser._id,
      username: newUser.username 
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error during signup.' });
    return;
  }
};

// 2. SIGN IN
export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Save refresh token in database for session validation
    user.refreshToken = refreshToken;
    await user.save();

    // Set Refresh Token as an secure HTTP-only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    });

    res.status(200).json({
      message: 'Signed in successfully',
      accessToken,
      user: { id: user._id, username: user.username, email: user.email }
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error during signin.' });
    return;
  }
};

// 3. REFRESH TOKEN ROTATION
export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
      res.status(401).json({ error: 'Unauthorized. No refresh token provided.' });
      return;
    }

    const incomingRefreshToken = cookies.refreshToken;

    const user = await User.findOne({ refreshToken: incomingRefreshToken });
    if (!user) {
      res.status(403).json({ error: 'Forbidden. Invalid refresh token session.' });
      return;
    }

    jwt.verify(incomingRefreshToken, REFRESH_SECRET, (err: any, decoded: any) => {
      if (err || user._id.toString() !== decoded.userId) {
        res.status(403).json({ error: 'Forbidden. Expired or invalid refresh token.' });
        return;
      }

      const newAccessToken = generateAccessToken(user._id.toString());
      res.status(200).json({ accessToken: newAccessToken });
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to refresh token.' });
    return;
  }
};
