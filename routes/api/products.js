const express = require('express')
const router = express.Router();
const { PAGE_SIZE } = require('../../utils/constants')
const Product = require('../../models/Product');
const authMiddleWare = require('../../middleware/Auth');

router.get('/',async (req, res) => {
  try {
    const { orderby, pagenum, search } = req.query;
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

    const count = await Product.countDocuments(query);
    const totalPages = Math.ceil(count / limit);

    const products = await Product.find(query)
      .sort(sortby)
      .skip(skip)
      .limit(limit)
      .populate('category');

    const nextPage = pageNum < totalPages ? '${req.baseUrl}?orderby=${orderby}&pagenum=${pageNum + 1}&search=${search}' : null;
    const prevPage = pageNum > 1 ? '${req.baseUrl}?orderby=${orderby}&pagenum=${pageNum - 1}&search=${search}' : null;

    res.json({
      products,
      nextPage,
      prevPage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sever Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const newProduct = new Product({
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      description: req.body.description
    });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/:id', authMiddleWare, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
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