const express = require('express')
const router = express.Router();
const postsController = require('../controllers/postsController');


router.get('/all-posts', postsController.getPosts);


module.exports = router;