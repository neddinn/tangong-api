'use strict';

var mongoose = require('mongoose');
require("../models/user.model");
require("../models/gig.model");

var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');

var User = mongoose.model('User');
var Gig = mongoose.model("Gig");

var mailer = require("./mailer.controller.js");
var bcrypt = require('bcrypt-nodejs');

//authentication
var jwt = require('jsonwebtoken');
var superSecret = 'tangoforme';

module.exports = {

  authenticateUser: function authenticateUser(req, res) {
    User.findOne({
      username: req.body.username
    }).select('username password email').exec(function (err, user) {
      if (err) {
        return res.json(err);
      } else if (!user) {
        res.json({
          message: 'User not found'
        });
      } else {
        var validPassword = user.comparePassword(req.body.password);
        if (!validPassword) {
          res.json({
            message: 'Wrong password'
          });
        } else {
          var token = jwt.sign({
            id: user._id,
            username: user.username,
            email: user.email
          }, superSecret, {
            expiresInMinutes: 43200
          }); //end var token
          res.json({
            success: true,
            message: 'Token Generated',
            token: token
          });
        }
      }
    });
  },

  verifyToken: function verifyToken(req, res, next) {
    var token = req.headers['x-access-token'];

    //if there is a token, decode it
    if (token) {
      jwt.verify(token, superSecret, function (err, user) {
        if (err) {
          return res.json({
            message: 'Token could not be authenticated'
          });
        } else {
          req.user = user;
          // res.json(user);
          next();
        }
      });
    } else {
      return res.status(403).json({
        message: 'Token not found'
      });
    }
  },
  getUserById: function getUserById(req, res, next) {
    User.findOne({
      username: req.params.username
    }, function (err, user) {
      if (err) {
        return res.json(err);
      }
      if (!user) {
        return res.json("User doesn't exist");
      }
      req.user_id = user._id;
      next();
    });
  },

  getUserByEmail: function getUserByEmail(req, res) {
    User.findOne({
      email: req.params.email
    }, function (err, user) {
      if (err) {
        return res.json(err);
      }
      if (!user) {
        return res.json("User doesn't exist");
      }
      res.status(200).json(user);
    });
  },

  addUser2: function addUser2(req, res) {
    User.create(req.body, function (err, user) {
      if (err) {
        if (err.code === 11000) {
          res.json({
            message: 'Username or Email already taken'
          });
        } else {
          res.json({
            message: err.errors.email.message
          });
        }
        res.json(err);
      }
      res.status(201).json(user.username);
    });
  },

  addUser: function addUser(req, res) {
    var user = new User(req.body);
    user.save(function (err, user) {
      if (err) {
        return res.json(err);
      }
      mailer.sendMail(user.email, "Welcome to Tango Nigeria", "Hello, " + user.username + " Welcome to Tango Nigeria. Login here: http://andela-ssunday.github.io/tangong");
      res.status(201).json(user);
    });
  },

  getUsers: function getUsers(req, res) {
    User.find(function (err, users) {
      if (err) {
        return res.json(err);
      }
      res.status(200).json(users);
    });
  },

  getOneUser: function getOneUser(req, res) {
    User.findById({
      _id: req.params.user_id
    }, function (err, user) {
      if (err) {
        return res.json(err);
      }
      res.status(201).json(user);
    });
  },

  getByUsername: function getByUsername(req, res) {
    User.findOne({
      username: req.params.username
    }, function (err, user) {
      if (err) {
        return res.json(err);
      }
      res.status(201).json(user);
    });
  },

  updateUser: function updateUser(req, res) {

    User.findById(req.params.user_id, function (err, user) {
      if (err) {
        return res.json(err);
      }
      user.username = req.body.username;
      user.password = req.body.password;
      user.save(function (err, result) {
        if (err) {
          return res.json(err);
        }
        var token = jwt.sign({
          id: result._id,
          username: result.username,
          email: result.email
        }, superSecret, {
          expiresInMinutes: 43200
        });
        res.status(201).json({
          token: token
        });
      });
    });
    // bcrypt.hash(req.body.password, null, null, function(err, hash) {
    //   req.body.password = hash;
    //   User.update({
    //     _id: req.params.user_id
    //   }, req.body, function(err, user) {
    //     if (err) {
    //       return res.json(err);
    //     }
    //     var token = jwt.sign({
    //       id: req.body._id,
    //       username: req.body.username,
    //       email: req.body.email
    //     }, superSecret, {
    //       expiresInMinutes: 43200
    //     });
    //     res.status(201).json({
    //       token: token
    //     });
    //   });
    // });
  },

  deleteUser: function deleteUser(req, res) {
    User.remove({
      _id: req.params.user_id
    }, function (err, user) {
      if (err) {
        return res.json(err);
      } else {
        Gig.remove({
          addedBy: req.params.user_id
        }, function (err, gig) {
          if (err) {
            return res.json(err);
          }
          res.status(200).json(gig);
        });
      }
    });
  },

  deleteAllUsers: function deleteAllUsers(req, res) {
    User.remove({}, function (err, users) {
      if (err) {
        return res.json(err);
      }
      res.status(200).json(users);
    });
  },

  forgot: function forgot(req, res, next) {

    async.waterfall([function (done) {
      crypto.randomBytes(20, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    }, function (token, done) {
      User.findOne({
        email: req.body.email
      }, function (err, user) {
        if (!user) {
          return res.json({
            message: 'No user found'
          });
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });
      });
    }, function (token, user, done) {
      var transporter = nodemailer.createTransport();
      var mailOptions = {
        to: user.email,
        from: 'Tango Nigeria ✔ <no-reply@tangong.com>',
        subject: 'Tango Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' + 'Please click on the following link, or paste this into your browser to complete the process:\n\n' + '\n\n' + 'http://andela-ssunday.github.io/tangong/#!/reset/password/' + token + '\n\n' + ' If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      transporter.sendMail(mailOptions, function (err, res) {
        done(err, 'done');
        return res;
      });
    }], function (err) {
      if (err) return next(err);
      res.json({
        message: 'Message Sent!'
      });
    });
  },

  reset: function reset(req, res) {
    async.waterfall([function (done) {
      User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      }, function (err, user) {
        if (!user) {
          return res.json({
            'message': 'User does not exist'
          });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function (err, result) {
          if (err) {
            return res.json(err);
          }
          console.log(result);
          res.json(result);
        });
      });
    }], function (err) {
      if (err) return err;
      res.json({
        message: 'Password changed!'
      });
    });
  }
};
//# sourceMappingURL=user.controller.js.map