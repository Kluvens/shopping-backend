const jwt = require('jsonwebtoken');

const authMiddleWare = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, 'RANDOM_TOKEN_SECRET');
    const userId = decodedToken.userId;
    if (req.body.userId && req.body.userId != userId) {
      res.status(401).json({ message: 'Invalid token' });
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleWare;