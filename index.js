const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const cookieParser = require('cookie-parser')
const UserModal = require('./models/UserModal')
const PostModel = require('./models/PostModel')
const dotenv = require('dotenv')
const colors = require('colors')

const app = express()
app.use(express.json())
app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

dotenv.config();

mongoose.connect(process.env.MONGO_URL)
.then(console.log(`Connected to MongoDB Database`.bgGreen))

app.use(cookieParser())
app.use(express.static('public'))


// middleware: are used to check anything before moving to next step like verifying user, or checking for file before uploading - verify using token
const verifyUser = (req, res, next) =>{
    const token = req.cookies.token;
    if (!token){
        return res.json("Token not found")
    }else{
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) =>{
            if (err){
                return res.json('Wrong Token')
            }else{
                req.email = decoded.email;
                req.username = decoded.username;
                next()
            }
        })
    }
}

app.get('/', verifyUser, (req, res) => {
     return res.json({email: req.email, username: req.username})
})

app.post('/register', (req, res) => {
    const {username, email, password} = req.body;
    bcrypt.hash(password, 10)
    .then(hash =>{
        UserModal.create({username, email, password: hash})
        .then(user => res.json(user))
        .catch(err => res.json(err))
    }).catch(err => res.json(err))
})

app.post('/login', (req, res) => {
    const {email, password} = req.body;
    UserModal.findOne({email: email})
     .then(user => {
        if (user){
            bcrypt.compare(password, user.password, (err, response) =>{
                if (response){
                    const token = jwt.sign({email: user.email, username: user.username}, process.env.JWT_SECRET, {expiresIn: '15d'} )
                    res.cookie('token', token)
                    return res.json("Success");
                }else{
                    return res.json("Incorrect Password");
                }
            })
        }else{
            res.json("User don't exists, Please register first")
        }
     })

})

app.get('/logout', (req, res) =>{
    res.clearCookie('token');
    return res.json("Success")
    
})

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, 'public/Images')
    },

    filename: (req, file, cb) =>{
        // fieldname is the name that we have sent from our frontend
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
})

app.post('/create', verifyUser, upload.single('file'), (req, res) =>{
    PostModel.create({title: req.body.title, description: req.body.description, file: req.file.filename, email: req.body.email})
    .then(result => res.json("Success"))
    .catch(err => res.json(err))
}) 

app.get('/getPosts', (req, res) =>{
    PostModel.find()
    .then(posts => res.json(posts))
    .catch(err => res.json(err))
})

app.get('/getPostById/:id', (req, res) =>{
    const id = req.params.id;
    PostModel.findById({_id: id})
    .then(post => res.json(post))
    .catch(err => res.json(err))

})

app.put('/editPost/:id', (req, res) =>{
    const id = req.params.id;
    PostModel.findByIdAndUpdate({_id: id}, {title: req.body.title, description: req.body.description})
    .then(re => res.json("Success"))
    .catch(err => res.json(err))
})

app.delete('/deletePost/:id', (req, res) =>{
    PostModel.findByIdAndDelete({_id: req.params.id})
    .then(result => res.json("Success"))
    .catch(err => res.json(err))
})


app.listen(process.env.PORT, ()=>{
    console.log(`Backend Server Started ....`.bgCyan);

})