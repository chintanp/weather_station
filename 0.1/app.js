
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    //socket = require('./routes/socket.js'),
    util = require('util'),
    http = require('http'),
    fs = require('fs'),
    net = require('net'),             // For TCP communication with datalogger
    url = require('url'),
    events = require('events'),
    path = require('path'),           //For manipulating file-paths
    request = require('request'),
    mongodb = require('mongodb');    // For sending data to mongolab

/*//Logging all the output here
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

//Overload console.log, so it also writes to the file
console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};
*/
//------------------------

var app = module.exports = express();
var server = require('http').createServer(app);

// Hook Socket.io into Express
var io = require('socket.io').listen(server);
io.set('log level', 1);         // Reduce the amount of logging

// Configuration
app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);

//io.sockets.on('connection', socket);

// Start server
server.listen(8000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

// Latitudes and longitudes, will not change for our AWS, but may change 
var latitude = 22.65587;
var longitude = 75.82626;

// These are required for uploading data to openweathermap.org
var username = "IPS Academy",
    password = "neotao",
    url_owm = 'http://' + username + ':' + password + '@openweathermap.org/data/post';


//For Communication with the Datalogger
var TCP_PORT = 7700;
var TCP_HOST = '172.16.102.16';

//Name of the database - default to localhost
var databaseUrl = "weatherdb"; // "username:password@example.com/mydb"

//Name of the collections
var collections = ["raw_data", "data_reports"]  //raw_data contains the data as obtained ....//data_reports contains daily/periodic reports generated on data.

//Connect to the database - using the module mongojs - which exposes mongodb like API to node
var db = require("mongojs").connect(databaseUrl, collections); 

//Connecting to MongoLab
var uri = 'mongodb://chintanp:neotao123@ds063809.mongolab.com:63809/weather_data';

// Emit welcome message on connection
io.sockets.on('connection', function(http_socket) {
    
    //This function is called when a socket connection is established
    //At this time, the mongodb query findOne, finds the most recent entry in the database,
    // removes, id, lat and long from them and them emits the event 'old_data' alongwith 
    // the data after some formatting.
     db.raw_data.findOne({$query:{},$orderby:{$natural:-1}}, {_id: 0, lat: 0, long: 0}, function(err, doc) {
      
      // doc contains the data returned from the query
      var row_data = doc;
      row_data = JSON.stringify(row_data);
      http_socket.emit('old_data', {livedata: row_data } );
    });
    
    http_socket.on('i am client', console.log);
});

//Create a TCP socket to read data from datalogger
var tcp_socket = net.createConnection(TCP_PORT, TCP_HOST);

//Socket Object exposes many events through 'on' - namely 'connect', 'data', 'end', 'error'
tcp_socket.on('error', function(error) {
  console.log("Error Connecting to TCP host: " + TCP_HOST);
});

tcp_socket.on('connect', function(connect) {
  
  // Send this string to being transmission and set the output format for the Datalogger
  tcp_socket.write("/h/E/M/R");

  console.log('connection established with TCP host: ' + TCP_HOST);
  tcp_socket.setEncoding('ascii');
});

// This function is called everytime new data is received from the datalogger
// i.e. when the 'data' event is triggered. The data is collected in variable data. 

tcp_socket.on('data', function(data) {
        
  //console.log('DATA ' + tcp_socket.remoteAddress + ': ' + data);

 // This event is emitted, observe the matching event in the frontend controller.
 // It receives this sent livedata and updates the view accordingly.
 io.sockets.emit('livedata', { livedata: data });

  
  
  //Parse the output from weather station into local variables that contain individual sensor's values
     
  //Declare arrays
  var dataArray = new Array();
  var dbObject = [];

  console.log("Data: ----- " + data);
  //'data' contains the data from the weather station -> Split to get the array
  var dataArray = data.split("\r\n");

  //Creating the string for inserting in db here
  var dbString = {
    "lat" : latitude.toString(),
    "long" : longitude.toString(),
    "date" : dataArray[0].split(" ")[1],
    "time" : dataArray[1].split(" ")[1],
    "temp_c" : dataArray[2].split(" ")[1],
    "humidity" : dataArray[3].split(" ")[1],
    "pressure_mbar" : dataArray[4].split(" ")[1],
    "wind_dir" : dataArray[5].split(" ")[1],
    "wind_speed_mps" : dataArray[6].split(" ")[1],
    "rain_mm" : dataArray[7].split(" ")[1],
    "solar_rad_wpsqm": dataArray[8].split(" ")[1]
  };

  JSON.stringify(dbString);

  db.raw_data.insert(dbString, function(err, saved){
      if( err || !saved ) console.log("Data not saved");
      else console.log("Data saved");
    });

    // Upload data to openweathermap.org
  request.post(url_owm, {form:{'temp':dbString.temp_c, 
                              'wind_dir': dbString.wind_dir,
                              'wind_speed': dbString.wind_speed_mps,
                              'humidity': dbString.humidity,
                              'pressure': dbString.pressure_mbar,
                              'lat': dbString.lat,
                              'long': dbString.long,
                              'lum': dbString.solar_rad_wpsqm,
                              'name': "AWSIES1"
                              }}, function optionalCallback (err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful on OWM!  Server responded with:', body);
  });

  // http://www.pwsweather.com/pwsupdate/pwsupdate.php?ID=AWSIES1&PASSWORD=neotao&dateutc=2014-07-31+15%3A20%3A01&winddir=225&windspeedmph=0.0&windgustmph=0.0&tempf=34.88&rainin=0.06&dailyrainin=0.06&monthrainin=1.02&yearrainin=18.26&baromin=29.49&dewptf=30.16&humidity=83&weather=OVC&solarradiation=183&UV=5.28&softwaretype=Examplever1.1&action=updateraw
  // Upload data to pwsweather.com
  var url_pws = "http://www.pwsweather.com/pwsupdate/pwsupdate.php?ID=AWSIES1&PASSWORD=neotao";
  url_pws += "&dateutc=" + dbString.date.replace('/', '-').replace('/','-') + "+" + dbString.time;
  url_pws += "&winddir=" + dbString.wind_dir;
  url_pws += "&windspeedmph=" + 2.23693*dbString.wind_speed_mps;
  url_pws += "&tempf=" + ((9/5)*dbString.temp_c + 32);
  url_pws += "humidity=" + dbString.humidity;
  url_pws += "solarradiation=" + dbString.solar_rad_wpsqm;
  url_pws += "&action=updateraw";

  console.log(url_pws);
  request.get(url_pws, function optionalCallback (err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful on PWS!  Server responded with:', body);
  });

  // Save the cloud db on MongoLab
  mongodb.MongoClient.connect(uri, function (err, cloud_db) {
    cloud_db.collection('raw_data', function(err, collection) {
		if(!err) {
			collection.insert(dbString, function(docs) {
				collection.count(function(err, count) {
					if(!err) {
						console.log("Saved to mongolab");
					}
		          
		        });
			});
		}
	});
  });

});

tcp_socket.on('end', function() {
  console.log('socket closing...');
});