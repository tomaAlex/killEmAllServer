var express = require('express');
var mysql = require('mysql');
var url = require('url');
var bodyParser = require('body-parser');
var jsdom = require("jsdom");
var urlencodedParser = bodyParser.urlencoded({extended:false});
var urlencodedParser_login = bodyParser.urlencoded({extended:false});
var { JSDOM } = jsdom;
var session = require('express-session');
var pug = require('pug');
var irc = require("irc");
var matchID = [];
var numberOfPlayers = [];

/*
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: ""
});

console.log("Connected!");

var sql = "CREATE DATABASE IF NOT EXISTS killEmAll";

con.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Database created");
});

sql = "CREATE TABLE IF NOT EXISTS users (firstName VARCHAR(255), secondName VARCHAR(255), email VARCHAR(255), username VARCHAR(255), password VARCHAR(255))";

con.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Database created");
});
*/

con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "killEmAll"
});

con.connect(function(err) {
  if(err) throw err;
  console.log('Connected!');
});

sql = "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, firstName VARCHAR(255), secondName VARCHAR(255), email VARCHAR(255), username VARCHAR(255), password VARCHAR(255))";
con.query(sql, function (err, result) {
  if (err) throw err;
  console.log("Table created");
});

var app = express();

var server = app.listen(3000);

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(session({secret: "ilovecristina"}));

app.get('/', function(req, res){
  if(req.session.username)
  {
    // the user is logged, so he/she can play!
    res.render('mainScreen.pug');
  }
  else
  {
    res.render('index.html');
  }
});

app.get('/signUp', function(req, res){
  //res.render('signUp');
  res.render('signUp.pug', {
    firstName: "",
    secondName: "",
    email: "",
    username: "",
    //error: "'" + req.body.username + "' is an invalid username...",
  });
});

var howMany = 0;

app.post('/signUp', urlencodedParser, function(req, res){
  console.log(req.body);
  // check whether the inputs are valid or not
  howMany = 0;
  function makeSelect(callback)
  {
    sql = "SELECT * FROM users WHERE username='" + req.body.username + "';";
    con.query(sql, function (err, rows) {
      if (err) throw err;
      rows.forEach(function(result) {
        howMany++;
      });
      console.log(howMany);
      callback();
    });
  }
  function isUsernameValid()
  {
    console.log('waiting for the action of counting to finish...');
    if(howMany == 0)
    {
      console.log("i am right in the if statement...");
      // the inputs are valid, they must be inserted into the database
      sql = "INSERT INTO users(firstName, secondName, email, username, password) VALUES('" + req.body.firstName + "', '" + req.body.secondName + "', '" + req.body.email + "', '" + req.body.username + "', '" + req.body.password + "');";
      con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("username and password were inserted into the database!");
      });
      res.render('signUp-success');
    }
    else
    {
      console.log("sorry... this username is invalid!");
      res.render('signUp.pug', {
        firstName: req.body.firstName,
        secondName: req.body.secondName,
        email: req.body.email,
        error: "'" + req.body.username + "' is an invalid username...",
      });
    }
  }
  makeSelect(isUsernameValid);
});

app.get('/login', function(req, res){
  res.render('login.pug');
});

app.post('/login', urlencodedParser_login, function(req, res){
  console.log(req.body);
  sql = "SELECT COUNT(id) as Cnt, id as ID, email, firstName, secondName FROM users WHERE username='" + req.body.username + "' AND password='" + req.body.password + "';";
  con.query(sql, function (err, result) {
    if (err) throw err;
    //console.log(result[0].Cnt);
    if(result[0].Cnt == 0)
    {
      console.log("user or password are wrong");
      //res.render('index');
      res.render('login.pug', {
        username: "",
        error: "user or password are wrong",
        password: ""
      });
    }
    else
    {
      // the username and password match the database
      req.session.username = req.body.username;
      req.session.password = req.body.password;
      req.session.ID = result[0].id;
      req.session.email = result[0].email;
      req.session.firstName = result[0].firstName;
      req.session.secondName = result[0].secondName;
      req.session.ID = result[0].ID;
      //console.log(result[0]);
      //console.log("logged in successfully: " + req.session.username + " " + req.session.password + " " + req.session.firstName + " " + req.session.secondName + " " + req.session.email + " " + req.session.ID);
      res.render('mainScreen.pug');
    }
  });
});

app.get('/logout', function(req, res){
  req.session.destroy();
  res.redirect("/");
});

app.get('/whichUser', function(req, res){
  res.send({username: req.session.username});
});

app.get('/checkIfChannelIsEmpty', function(req, res){
  req.session.idForGame = req.param('id');
  req.session.channelEntered = req.session.idForGame;
  //req.session.numberOfPlayers = 0;
  //req.session.listeningBot = new irc.Client("irc.accessirc.net", req.session.username, {
  //  channels: req.session.idForGame,
  //  autoConnect: false
  //});
  //req.session.listeningBot.connect();
  //req.session.listeningBot.addListener("join", function(channel, who){
    // count how many players are online
    //req.session.numberOfPlayers++;
    //req.session.listeningBot.say(channel, who + ", " + req.session.numberOfPlayers);
  //});
  if(typeof matchID[req.session.idForGame] === 'undefined')
  {
    var players = [
      {
        firstName: req.session.firstName,
        secondName: req.session.secondName,
        id: req.session.ID,
        username: req.session.username,
        email: req.session.email
      },
      {
        firstName: "",
        secondName: "",
        id: "",
        username: "",
        email: ""
      },
      {
        firstName: "",
        secondName: "",
        id: "",
        username: "",
        email: ""
      },
      {
        firstName: "",
        secondName: "",
        id: "",
        username: "",
        email: ""
      },
      {
        firstName: "",
        secondName: "",
        id: "",
        username: "",
        email: ""
      },
      {
        firstName: "",
        secondName: "",
        id: "",
        username: "",
        email: ""
      }
    ];
    matchID[req.session.idForGame] = players;
    numberOfPlayers[req.session.idForGame] = 1;
    res.send({isEmpty: true});
  }
  else res.send({isEmpty: false});
});

/*app.get('/botIsListeningForEntrance', function(req, res){
  //if(req.session.numberOfPlayers == 0) req.session.listeningBot.connect();
});
*/

app.get('/isChannelDefined', function(req, res){
  var channelToVerify = req.param('id');
  if(typeof numberOfPlayers[channelToVerify] === 'undefined')
  {
    res.send({isDefined: false, errormsg: "sorry, but this channel does not exist..."});
  }
  else
  {
    // check if the player who is trying to get into the match isn't the same with the previous ones
    let playerCanEnter = true;
    console.log(matchID[channelToVerify]);
    function checkIfIdAlreadyExists(callback)
    {
      if(numberOfPlayers[channelToVerify] >= 5) playerCanEnter = false;
      let lastCheck = true;
      let iPlayers = numberOfPlayers[channelToVerify];
      for(let i=1;i<=iPlayers || lastCheck;i++)
      {
        console.log("i : " + i);
        if(i <= iPlayers)
        {
          if(matchID[channelToVerify][i].id == req.session.ID)
          {
            playerCanEnter = false;
            console.log("this id already exists...");
          }
        }
        if(i==iPlayers+1)
        {
          if(matchID[channelToVerify][i-1].id == req.session.ID)
          {
            playerCanEnter = false;
            console.log("this id already exists...");
          }
          lastCheck = false;
          i = numberOfPlayers[channelToVerify] + 100;
          callback();
        }
      }
    }
    function buildTheResponse()
    {
      console.log("being in the callback...");
      if(playerCanEnter)
      {
        let playerNr = ++numberOfPlayers[channelToVerify];
        matchID[channelToVerify][playerNr].firstName = req.session.firstName;
        matchID[channelToVerify][playerNr].secondName = req.session.secondName;
        matchID[channelToVerify][playerNr].username = req.session.username;
        matchID[channelToVerify][playerNr].email = req.session.email;
        matchID[channelToVerify][playerNr].id = req.session.ID;
        req.session.channelEntered = channelToVerify;
        if(numberOfPlayers[channelToVerify] < 5) res.send({isDefined: true, currentNumberOfPLayers: playerNr});
        else if(numberOfPlayers[channelToVerify] == 5) res.send({isDefined: true, currentNumberOfPLayers: "the match can begin"});
      }
      else res.send({isDefined: false, errormsg: "you've already entered a channel! please, wait for a response..."}); // it is one of the previous players
    }
    if(numberOfPlayers[channelToVerify] < 5)
    {
      checkIfIdAlreadyExists(buildTheResponse);
    }
    else res.send({isDefined: false, errormsg: "sorry, but the channel is full of players :("});
  }
});

app.get('/shouldTheGameBegin', function(req, res){
  if(req.session.channelEntered)
  {
    if(numberOfPlayers[req.session.channelEntered] == 5)
    {
      //console.log("the game begins");
      res.send({msg: "the game begins!"});
    }
    else
    {
      let numberLeft = 5 - numberOfPlayers[req.session.channelEntered];
      //console.log("only " + numberLeft + " players left to enter!");
      res.send({msg: "only " + numberLeft + " players left to enter!"});
    }
  }
  else
  {
    //console.log("the game has not been created yet...");
    res.send({msg: "the game has not been created yet..."});
  }
});