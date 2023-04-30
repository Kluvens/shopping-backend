const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const authMiddleWare = require('../../middleware/Auth');

router.post('/register', async(req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // check if password and confirmPassword match
    if (password != confirmPassword) {
      return res.status(400).json({ message: 'confirm password does not match password' });
    }

    // check if the user already exists
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    // save the user to the database
    await newUser.save();

    // generate a JWT token
    const token = jwt.sign({ userId: newUser._id }, 'RANDOM_TOKEN_SECRET');

    // return the token to the client
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const userEmail = req.body.email;
  const userPassword = req.body.password;

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
    } 

    const passwordMatch = await bcrypt.compare(userPassword, user.password);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, 'RANDOM_TOKEN_SECRET');
    res.status(200).json({ token: token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to get user profile information
router.get('/profile/:id', authMiddleWare, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { userName, email, firstName, lastName, phoneNumber, address, favourites, cart, createdAt } = user;
    res.status(200).json({ userName, email, firstName, lastName, phoneNumber, address, favourites, cart, createdAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cart/:id', authMiddleWare, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const cart = user.cart;
    return res.status(200).json({ cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
})

module.exports = router;