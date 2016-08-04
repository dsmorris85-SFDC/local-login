var promise = require('bluebird'); // or any other Promise/A+ compatible library;
var util = require('util');
var passwordHash = require('password-hash');
var options = {
    promiseLib: promise // overriding the default (ES6 Promise);
};

var pgp = require('pg-promise')(options);

// Database connection details;
var cn = {
    host: 'localhost', // 'localhost' is the default;
    port: 5432, // 5432 is the default;
    database: 'YOUR-DB-NAME',
    user: 'YOUR-USERNAME',
    password: 'YOUR-PASSWORD'
};

var db = pgp(cn); // database instance;
    

    exports.findUserByEmail = function(username,cb){

        // t is used to share the same connection for what could be two calls
        return db.task(function (t) {
                return t.oneOrNone('SELECT * FROM userTable WHERE userEmail = $1', username);
            })
            .then(function (user) {
                if(user)
                    {return cb('OK-USR100', user);}
                if(!user)
                    {return cb('ER-USR550', null);}
            })  
            .catch(function (error) {
                console.log('ER-DB500 - An error occurred connecting to the DB');
                console.log(error);                   
                return cb('ER-DB500',null);
            });   
    }  

    exports.findUserById = function(id,cb){

        // t is used to share the same connection for what could be two calls
        return db.task(function (t) {
                return t.oneOrNone('SELECT * FROM userTable WHERE userId = $1', id);
            })
            .then(function (user) {
                if(user)
                {return cb(null, user);}
                if(!user)
                {return cb(null,null);}
            })
            .catch(function (error) {
                console.log('ER-DB500 - An error occurred connecting to the DB');   
                console.log(error);                             
                return cb('ER-DB500',null);
            });     
    }

    exports.insertNewUser = function(user,cb){

        var username = user.username;
        var userPassword = user.password;
        var userFirstName = user.firstname;
        var userLastName = user.lastname;

        var hashedPassword = passwordHash.generate(user.password);

        // t is used to share the same connection for what could be two calls
        return db.task(function (t) {
            return t.oneOrNone('SELECT userId FROM userTable WHERE userEmail = $1', username)
            .then(function (user) {
                if(user != null)
                {
                    return cb(new Error("Existing User found"),user.userId); 
                }
                if(user == null)
                {

                    return t.oneOrNone('INSERT INTO userTable(userEmail, userPassword, userFirstName, userLastName) VALUES($1,$2,$3,$4) RETURNING oa_uid', [username,hashedPassword,userFirstName,userLastName])
                    .then(function (insertedUser) {
                            if(insertedUser != null){
                                return cb(null,insertedUser.userId); 
                            }
                            if(insertedUser == null){
                                return cb(new Error("Could not add new user"),insertedUser.userId); 
                            }                            
                    });

                }                
            })
            .catch(function (error) {
                console.log('ER-DB500 - An error occurred connecting to the DB');    
                console.log(error);           
                return cb('ER-DB500',null);
            });  

    });
}
