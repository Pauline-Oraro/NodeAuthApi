const express = require('express');

//importing authController
const authController = require('../controllers/authController');

//router
const router = express.Router();


router.post('/signup',authController.signup);
router.post('/signin',authController.signin);
router.post('/signout',authController.signout);
router.patch('/send-verification-code', authController.sendVerificationCode);


module.exports = router;
