const express = require('express')
const router = express.Router();
const { PAGE_SIZE } = require('../../utils/constants');
const Product = require('../../models/Product');
const authMiddleWare = require('../../middleware/Auth');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './routes/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});
const upload = multer({ storage: storage });

router.get('/',async (req, res) => {
  try {
    const { category, orderby, pagenum, search } = req.query;
    const pageSize = PAGE_SIZE;
    const pageNum = parseInt(pagenum) || 1;

    const orderbyList = ['random', 'price', 'created', 'favourites'];
    if (!orderbyList.includes(orderby)) {
      return res.status(400).json({ message: 'Invalid orderby parameter' });
    }

    let sortby;
    switch (orderby) {
      case 'price':
        sortby = { price: 1 };
        break;
      case 'created':
        sortby = { createdAt: -1 };
        break;
      case 'favourites':
        sortby = { favouritesCount: -1 };
        break;
      case 'random':
      default:
        sortby = { _id: 1 };
    }

    const skip = (pageNum - 1) * pageSize;
    const limit = pageSize;
    
    const query = {
      name: { $regex: new RegExp(search, "i") }
    };

    if (category && category !='all') {
      query.category = category;
    }

    const count = await Product.countDocuments(query);
    const totalPages = Math.ceil(count / limit);

    const products = await Product.find(query)
      .sort(sortby)
      .skip(skip)
      .limit(limit)
      .populate('category');

    const nextPage = pageNum < totalPages ? 'next' : '';
    const prevPage = pageNum > 1 ? 'prev' : '';

    const imageDataArray = [];

    for (const product of products) {
      const imagePath = product.image;
      const imageData = await fs.promises.readFile(imagePath);
      imageDataArray.push(imageData);
    }

    res.json({
      products: products.map((product, index) => {
        return {
          _id: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
          description: product.description,
          image: {
            data: imageDataArray[index],
            contentType: 'image/png'
          }
        };
      }),
      nextPage,
      prevPage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sever Error' });
  }
});

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const newProduct = new Product({
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      description: req.body.description,
      image: req.file.path,
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/home', async (req, res) => {
  try {
    const favourites = await Product.find().sort({favouritesCount: -1}).limit(10).exec();
    let favouritesWithBuffer = [];
    for (const product of favourites) {
      const imagePath = product.image;
      const buffer = await fs.promises.readFile(imagePath);
      const productWithBuffer = {
        ...product.toObject(),
        imageBuffer: buffer
      };
      favouritesWithBuffer.push(productWithBuffer);
    }

    const products = await Product.aggregate([{ $sample: { size: 10 } }]);
    let productsWithBuffer = [];
    for (const product of products) {
      const imagePath = product.image;
      const buffer = await fs.promises.readFile(imagePath);
      const productWithBuffer = {
        _id: product._id,
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description,
        imageBuffer: buffer
      };
      productsWithBuffer.push(productWithBuffer);
    }

    res.status(200).json({ favourites: favouritesWithBuffer, randomProducts: productsWithBuffer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  const productId = req.params.id;
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, 'RANDOM_TOKEN_SECRET');
  const userId = decoded.userId;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isProductInFavorites = user.favourites.some((favoriteProduct) => favoriteProduct.equals(productId));

    res.status(200).json({ product, isFavourite: isProductInFavorites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    // Update product's properties
    product.name = req.body.name || product.name;
    product.category = req.body.category || product.category;
    product.description = req.body.description || product.description;
    product.price = req.body.price || product.price;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    await product.remove();

    res.json({ msg: 'Product removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;