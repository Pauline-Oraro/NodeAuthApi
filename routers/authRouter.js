const express = require('express');

//importing authController
const authController = require('../controllers/authController');

//router
const router = express.Router();


router.post('/signup',authController.signup);
router.post('/signin',authController.signin);

module.exports = router;
