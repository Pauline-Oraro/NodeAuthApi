const jwt = require('jsonwebtoken')

const {signupSchema, signinSchema} = require ('../middlewares/validator');

//importing usersModel
const User = require ('../models/usersModel');

const { doHash, doHashValidation} = require('../utils/hashing');

exports.signup = async (req, res) => {
    //provide email and password 
    const { email, password } = req.body;

    try{
        //validate the email and password
        const {error, value} = signupSchema.validate({email, password});

        //check for errors
        if(error){
            return res.status(401).json({success: false, message: error.details[0].message });
        }

        //if there are no errors
        const existingUser = await User.findOne({ email });

        //if user exists
        if(existingUser){
            return res.status(401).json({ success: false, message: 'User already exists' });
        }

        //if user does not exist

        const hashedPassword = await doHash(password, 12);

        const newUser = new User({
            email,
            password: hashedPassword
        });
        const result = await newUser.save();
        result.password = undefined; // Do not return the password in the response
        res.status(201).json({ success: true, message: 'User created successfully', user: result });
    }
    catch (error){
        console.log(error)
    }

}

//signin functionality
exports.signin = async (req, res) => {
    const {email, password} = req.body;

    try {
        //validate the email and password
        const {error, value} = signinSchema.validate({email, password});

        //check for errors
        if(error){
            return res.status(401).json({success: false, message: error.details[0].message });
        }

        const existingUser = await User.findOne({email}).select('+password');

        //if there is no existing user
        if(!existingUser){
            return res.status(401).json({ success: false, message: 'User does not exist' });
        }

        //if user exists compare the password
        const result =  await doHashValidation(password, existingUser.password);

        //check if result is false
        if(!result){
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        //if result is valid
        const token =jwt.sign({
            userId: existingUser._id,
			email: existingUser.email,
			verified: existingUser.verified,
        }, process.env.TOKEN_SECRET, { expiresIn: '8h' })

        res
        .cookie('Authorization', 'Bearer ' + token, {
        expires: new Date(Date.now() + 8 * 3600000),
		httpOnly: process.env.NODE_ENV === 'production',
		secure: process.env.NODE_ENV === 'production',
    })
        .json({ success: true, token, message: 'User signed in successfully', user: existingUser });
    }

    catch(error){
        console.log(error);
    }
}


//signout functionality
exports.signout = async (req, res) => {
    res.clearCookie('Authorization').status(200).json({ success: true, message: 'User signed out successfully' });
}
