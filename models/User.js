const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    postcode: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  favourites: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    default: []
  },
  cart: {
    type: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: {
        type: Number,
        default: 1
      }
    }],
    default: []
  }
});

module.exports = User = mongoose.model('User', UserSchema);