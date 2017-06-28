/**
 * Created by simon on 28/06/17.
 */

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "projet_bonbons",
  password: "projet_bonbons"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("connected");
});
