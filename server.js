'use strict';

var app = require('./app.js');
var port = process.env.PORT || 8080;

app.listen(port, function(err){
  if(err){
    return err;
  }
  console.log("Server started at http://localhost:" + port)
});
