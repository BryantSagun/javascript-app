const express = require('express');
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const markdown = require('marked')
const app = express();
const sanitizeHTML = require('sanitize-html')

let sessionOptions = session({
     secret: "Test Secret",
     store: new MongoStore({client: require('./db')}),
     resave: false,
     saveUninitialized: false,
     cookie: {
          maxAge: 1000 * 60 * 60 * 1,
          httpOnly: true
     }
})

app.use(sessionOptions)
app.use(flash())

app.use(function(req, res, next){
     res.locals.filterUserHTML = function(content){
          return sanitizeHTML(markdown(content), {
               allowedTags: ['p', 'br', 'ul', 'li', 'strong', 'bold', 'italic', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
               allowedAttributes: []
          })
     }

     res.locals.errors = req.flash("errors")
     res.locals.success = req.flash("success")

     if(req.session.user){
          req.visitorId = req.session.user._id
     } else{
          req.visitorId = 0
     }

     res.locals.user = req.session.user
     next()
})

const router = require('./router')

app.use(express.urlencoded({extended: false}))
app.use(express.json())

app.use(express.static('public'))

app.set('views', 'views')
app.set('view engine', 'ejs')

app.use('/', router)

const server = require('http').createServer(app)

const io = require('socket.io')(server)

io.on('connection', function(socket){
     socket.on("chatMessageFromBrowser", function(data){
          io.emit('chatMessageFromServer', {
               message: data.message
          })
     })
})

module.exports = server