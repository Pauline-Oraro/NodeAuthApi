const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require ('mongoose');

const authRouter = require('./routers/authRouter');
const postsRouter = require('./routers/postsRouter');

//initialize express
const app = express();

//use json
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);

//connecting the database
mongoose
.connect(process.env.MONGODB_URI, {})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((error) => {
    console.error('MongoDB connection error:', error);
});



app.get('/', (req, res) => {
    res.json({ message: 'NodeAuth API' });
})

//listening on port
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
})