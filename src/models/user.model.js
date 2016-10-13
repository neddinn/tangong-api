var express = require('express');
var app = express();
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');

var Schema = mongoose.Schema;
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');

var UserSchema = new Schema({
    username: {
        type: String,
        required: 'Enter valid username',
        index: {
            unique: true
        }
    },
    email: {
        type: String,
        required: 'Enter email',
        index: {
            unique: true
        }
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    salt: {
        type: String
    },
    hash: {
        type: String
    },
}, {
    timeStamps: true
});

UserSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
};

UserSchema.methods.comparePassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
    return this.hash === hash;
};

UserSchema.methods.generateJWT = function() {
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 60);
    var token = jwt.sign({
        _id: this._id,
        name: this.name,
        email: this.email,
        exp: parseInt(exp.getTime() / 1000)
    }, 'secretKey');
    this.token = token;
    return token;
};

mongoose.model('User', UserSchema);
