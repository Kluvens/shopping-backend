const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const authMiddleWare = require('../../middleware/Auth');
const fs = require('fs');
const Product = require('../../models/Product');

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
      userName: name,
      email,
      password: hashedPassword,
    });

    // save the user to the database
    await newUser.save();

    // generate a JWT token
    const token = jwt.sign({ userId: newUser._id }, 'RANDOM_TOKEN_SECRET');

    // return the token to the client
    res.status(201).json({ token, userId: newUser._id });
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
    if (user === null) {
      res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(userPassword, user.password);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, 'RANDOM_TOKEN_SECRET');
    res.status(200).json({ token, userId: user._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate('cart.product');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { userName, email, firstName, lastName, phoneNumber, address, favourites, cart, createdAt } = user;
    let cartWithBuffer = [];
    for (const item of cart) {
      const imagePath = item.product.image;
      const buffer = await fs.promises.readFile(imagePath);
      const productWithBuffer = {
        ...item.product.toObject(),
        imageBuffer: buffer
      };
      const itemWithBuffer = {
        ...item.toObject(),
        product: productWithBuffer
      };
      cartWithBuffer.push(itemWithBuffer);
    }

    // let favouritesWithBuffer = [];
    // for (const item of favourites) {
    //   const imagePath = item.product.image;
    //   const buffer = await fs.promises.readFile(imagePath);
    //   const productWithBuffer = {
    //     ...item.product.toObject(),
    //     imageBuffer: buffer
    //   };
    //   const itemWithBuffer = {
    //     ...item.toObject(),
    //     product: productWithBuffer
    //   };
    //   favouritesWithBuffer.push(itemWithBuffer);
    // }
    res.status(200).json({ userName, email, firstName, lastName, phoneNumber, address, favourites, cart: cartWithBuffer, createdAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cart/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate('cart.product');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    let cart = user.cart;
    let cartWithBuffer = [];
    for (const item of cart) {
      const imagePath = item.product.image;
      const buffer = await fs.promises.readFile(imagePath);
      const productWithBuffer = {
        ...item.product.toObject(),
        imageBuffer: buffer
      };
      const itemWithBuffer = {
        ...item.toObject(),
        product: productWithBuffer
      };
      cartWithBuffer.push(itemWithBuffer);
    }
    return res.status(200).json({ cart: cartWithBuffer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/cart/add/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'RANDOM_TOKEN_SECRET');
    const userId = decoded.userId;
    const productId = req.params.productId;
    const quantity = 1;

    const user = await User.findById(userId).populate('cart.product');

    const existingProductIndex = user.cart.findIndex(item => item._id.toString() === productId);
    
    if (existingProductIndex !== -1) {
      user.cart[existingProductIndex].quantity += quantity;
    } else {
      user.cart.push({ product: productId, quantity });
    }

    await user.save();
    res.status(200).json({ message: 'Product added to cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/cart/remove/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'RANDOM_TOKEN_SECRET');
    const userId = decoded.userId;
    const productId = req.params.productId;
    const quantity = 1;

    const user = await User.findById(userId).populate('cart.product');

    const existingProductIndex = user.cart.findIndex(item => item._id.toString() === productId);

    if (existingProductIndex !== -1) {
      if (user.cart[existingProductIndex].quantity > 1) {
        user.cart[existingProductIndex].quantity -= quantity;
      }
    }

    await user.save();
    res.status(200).json(user.cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/cart/delete/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'RANDOM_TOKEN_SECRET');
    const userId = decoded.userId;
    const productId = req.params.productId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const cartItemIndex = user.cart.findIndex(item => item._id.toString() === productId);
    if (cartItemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    user.cart.pull(user.cart[cartItemIndex]);
    await user.save();

    return res.status(200).json({ message: 'Product removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/cart/:productId', authMiddleWare, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    const user = await User.findById(userId).populate('cart.product');

    // Check if the product exists in the user's cart
    const cartItem = user.cart.find(item => item.product.id === productId);
    if (!cartItem) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Remove the product from the user's cart
    user.cart.pull({ _id: cartItem._id });
    await user.save();

    res.status(200).json({ message: 'Product removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/favourites/add/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'RANDOM_TOKEN_SECRET');
    const userId = decoded.userId;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    const user = await User.findById(userId).populate('favourites.product');

    const existingProductIndex = user.favourites.findIndex(item => item._id.toString() === productId);
    
    if (existingProductIndex === -1) {
      product.favoritesCount++;
      user.favourites.push(productId);
    }

    await product.save();
    await user.save();
    res.status(200).json({ message: 'Product added to Favourites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/favourites/remove/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'RANDOM_TOKEN_SECRET');
    const userId = decoded.userId;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    const user = await User.findById(userId).populate('favourites.product');

    const existingProductIndex = user.favourites.findIndex(item => item._id.toString() === productId);
    
    if (existingProductIndex !== -1) {
      product.favoritesCount--;
      user.favourites = user.favourites.filter((item) => !item.equals(productId));
    }

    await product.save();
    await user.save();
    res.status(200).json({ message: 'Product added to Favourites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;