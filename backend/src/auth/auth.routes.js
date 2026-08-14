import express from 'express';
import bcrypt from 'bcrypt';
import { loadUsers, saveUsers } from '../services/storage.service.js';

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      fullName, 
      hospital = '', 
      department = '', 
      license = '' 
    } = req.body;

    // Accept either username or email as the email field
    const userEmail = email || username;
    const userName = fullName || username;

    if (!userName || !userEmail || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, email and password required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters' 
      });
    }

    const users = await loadUsers();

    if (users.find(u => u.email === userEmail || u.username === userEmail)) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already registered' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: 'DOC_' + Date.now(),
      username: userEmail,
      email: userEmail,
      name: userName,
      fullName: userName,
      hospital,
      department,
      license,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    res.status(201).json({ 
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        hospital: newUser.hospital,
        department: newUser.department
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed' 
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Accept either username or email
    const userIdentifier = email || username;

    if (!userIdentifier || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password required' 
      });
    }

    const users = await loadUsers();
    const user = users.find(u => u.email === userIdentifier || u.username === userIdentifier);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    res.json({ 
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name || user.fullName || user.username,
        email: user.email,
        hospital: user.hospital
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});

export default router;