var express = require('express');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var dbOperations = require('./dbOperations');
var util = require('util');
var passwordHash = require('password-hash');
var flash = require('connect-flash');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;


// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.

passport.use(new Strategy(
  function(username, password, cb) {
    dbOperations.findUserByEmail(username, function(err, user) {

        if (err && err != 'OK-USR100') 
          { console.log('err is :' + err);
            return cb(err); }
        if (!user) 
          { return cb('ER-USR500', false); }
        if(user && err == 'OK-USR100')
          { if (passwordHash.verify(password, user.userPassword))
            { return cb(null, user); }
            else
            { return cb('ER-USR550', false); }}
    });
  }));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.userId);
});

passport.deserializeUser(function(id, cb) {
  dbOperations.findUserById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});


// create the Express App
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views/pages');
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());


// Define routes.
app.get('/',
  function(req, res) {
    res.render('index', { user: req.user, message: {type: null, isError: false, message: null} });
  });
  

app.post('/login', function(req,res,next){
  
    passport.authenticate('local',function(err, user) {  
      if(!user && err=='ER-USR550')
        {res.render('home', { user: req.user, message: {type: 'login', isError: true, message: 'Invalid Username or Password'} });}
      if(!user && err=='ER-DB500')
        {res.render('home', { user: req.user, message: {type: 'login', isError: true, message: 'Could not verify your details'} });}
      if(user)
        {req.logIn(user, function(err) {
            if (err) { return next(err); }
            res.redirect('/home');
        });}
    })(req,res,next);

});

  
app.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
  });


app.get('/home',
  ensureLoggedIn('/'),
  function(req, res){
    res.render('home', { user: req.user });
  });


 app.post('/register', function(req, res){
    dbOperations.insertNewUser({username: req.body.regusername, password: req.body.regpassword, firstname: req.body.regfirstname, lastname: req.body.reglastname}, function(error, user){
        if(error){
            res.render('home', { user: req.user, message: {type: 'register', isError: true, message: error} });
        } else {  
            res.render('home', { user: req.user, message: {type: 'register', isError: false, message: 'Thank you, you are registered'} });
        }
    });
}); 

// set the port, and listen for activity
var port = process.env.PORT || 5000;  //select  port or pull from  .env file
app.listen(port);
console.log("listening on " + port + "!");