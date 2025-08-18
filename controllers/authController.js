const jwt = require('jsonwebtoken')

const {signupSchema, signinSchema, acceptCodeSchema} = require ('../middlewares/validator');

//importing usersModel
const User = require ('../models/usersModel');

const { doHash, doHashValidation, hmacProcess} = require('../utils/hashing');

const transport = require('../middlewares/sendMail');

//signup functionality
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

//verification code
exports.sendVerificationCode = async (req, res) => {
    const { email } = req.body;

    try{
        //check if user exists with the provided email
        const existingUser = await User.findOne({email})

        //if user doesn't exist
        if(!existingUser){
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        //if user exists with the provided email
        if(existingUser.verified){
            return res
				.status(400)
				.json({ success: false, message: 'You are already verified!' });
        }

        //if not verified, send verification code
        const codeValue = Math.floor(Math.random() * 1000000).toString();
        let info = await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: existingUser.email,
            subject: 'Verification Code',
            text: `Your verification code is ${codeValue}`,
            html: '<h1>' + codeValue + '</h1>'
        });

        if(info.accepted[0] === existingUser.email){
            const hashedCodeValue = hmacProcess(
                codeValue,
                process.env.HMAC_VERIFICATION_CODE_SECRET
            )
            existingUser.verificationCode = hashedCodeValue;
            existingUser.verificationCodeValidation = Date.now() 
            await existingUser.save();
			return res.status(200).json({ success: true, message: 'Code sent!' });
        }

        //if code has not being sent
        res.status(400).json({ success: false, message: 'Code not sent' });

    }

    catch (error){
        console.log(error);
    }
}


//verify verification code
exports.verifyVerificationCode = async (req, res) => {
    const {email, providedCode} = req.body;

    try{
        const {error, value} = acceptCodeSchema.validate({email, providedCode});
        if (error) {
			return res
				.status(401)
				.json({ success: false, message: error.details[0].message });
		}
        const codeValue = providedCode.toString();
        const existingUser = await User.findOne({ email }).select(
			'+verificationCode +verificationCodeValidation'
		);

        //if existinguser doesn't exist
        if (!existingUser) {
			return res
				.status(401)
				.json({ success: false, message: 'User does not exists!' });
		}

        //if user is verified
        if (existingUser.verified) {
			return res
				.status(400)
				.json({ success: false, message: 'you are already verified!' });
		}

        if (
			!existingUser.verificationCode ||
			!existingUser.verificationCodeValidation
		) {
			return res
				.status(400)
				.json({ success: false, message: 'something is wrong with the code!' });
		}

        if (Date.now() - existingUser.verificationCodeValidation > 5 * 60 * 1000) {
			return res
				.status(400)
				.json({ success: false, message: 'code has expired!' });
		}

        const hashedCodeValue = hmacProcess(
			codeValue,
			process.env.HMAC_VERIFICATION_CODE_SECRET
		);
		if (hashedCodeValue === existingUser.verificationCode) {
			existingUser.verified = true;
			existingUser.verificationCode = undefined;
			existingUser.verificationCodeValidation = undefined;
			await existingUser.save();
			return res
				.status(200)
				.json({ success: true, message: 'your account has been verified!' });
		}
		return res
			.status(400)
			.json({ success: false, message: 'unexpected error occurred!!' });
    }
    catch(error){
        console.log(error);
    }
}