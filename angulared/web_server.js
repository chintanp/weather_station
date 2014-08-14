#!/usr/bin/env node

var util = require('util'),
    http = require('http'),
    fs = require('fs'),
    net = require('net'),             // For TCP communication with datalogger
    url = require('url'),
    events = require('events'),
    path = require('path'),           //For manipulating file-paths
    request = require('request');       // For uploading data to other websites  

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

//Required for socket.io
var parts1 = __dirname.split('\\');
console.log(parts1);
parts1.splice(parts1.length - 1);
console.log(parts1);
console.log(parts1.join('/'));
//var index = fs.readFileSync(parts1.join('/') + '/app/index.html');

//Connecting to MongoDB 

//Name of the database - default to localhost
var databaseUrl = "weatherdb"; // "username:password@example.com/mydb"

//Name of the collections
var collections = ["raw_data", "data_reports"]  //raw_data contains the data as obtained ....//data_reports contains daily/periodic reports generated on data.

//Connect to the database - using the module mongojs - which exposes mongodb like API to node
var db = require("mongojs").connect(databaseUrl, collections);

// Send index.html to all requests
var app = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index);
});

// Socket.io server listens to our app
var io = require('socket.io').listen(app);

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

});

tcp_socket.on('end', function() {
  console.log('socket closing...');
});


app.listen(3000);

/* _______________________________________________________________________ */

//Supplied with Angular

var DEFAULT_PORT = 8000;

function main(argv) {
  new HttpServer({
    'GET': createServlet(StaticServlet),
    'HEAD': createServlet(StaticServlet)
  }).start(Number(argv[2]) || DEFAULT_PORT);
}

function escapeHtml(value) {
  return value.toString().
    replace('<', '&lt;').
    replace('>', '&gt;').
    replace('"', '&quot;');
}

function createServlet(Class) {
  var servlet = new Class();
  return servlet.handleRequest.bind(servlet);
}

/**
 * An Http server implementation that uses a map of methods to decide
 * action routing.
 *
 * @param {Object} Map of method => Handler function
 */
function HttpServer(handlers) {
  this.handlers = handlers;
  this.server = http.createServer(this.handleRequest_.bind(this));
}

HttpServer.prototype.start = function(port) {
  this.port = port;
  this.server.listen(port);
  util.puts('Http Server running at http://localhost:' + port + '/');
};

HttpServer.prototype.parseUrl_ = function(urlString) {
  var parsed = url.parse(urlString);
  parsed.pathname = url.resolve('/', parsed.pathname);
  return url.parse(url.format(parsed), true);
};

HttpServer.prototype.handleRequest_ = function(req, res) {
  var logEntry = req.method + ' ' + req.url;
  if (req.headers['user-agent']) {
    logEntry += ' ' + req.headers['user-agent'];
  }
  util.puts(logEntry);
  req.url = this.parseUrl_(req.url);
  var handler = this.handlers[req.method];
  if (!handler) {
    res.writeHead(501);
    res.end();
  } else {
    handler.call(this, req, res);
  }
};

/**
 * Handles static content.
 */
function StaticServlet() {}

StaticServlet.MimeMap = {
  'txt': 'text/plain',
  'html': 'text/html',
  'css': 'text/css',
  'xml': 'application/xml',
  'json': 'application/json',
  'js': 'application/javascript',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'png': 'image/png',
  'svg': 'image/svg+xml'
};

StaticServlet.prototype.handleRequest = function(req, res) {
  var self = this;
  var path = ('./' + req.url.pathname).replace('//','/').replace(/%(..)/g, function(match, hex){
    return String.fromCharCode(parseInt(hex, 16));
  });
  var parts = path.split('/');
  if (parts[parts.length-1].charAt(0) === '.')
    return self.sendForbidden_(req, res, path);
  fs.stat(path, function(err, stat) {
    if (err)
      return self.sendMissing_(req, res, path);
    if (stat.isDirectory())
      return self.sendDirectory_(req, res, path);
    return self.sendFile_(req, res, path);
  });
}

StaticServlet.prototype.sendError_ = function(req, res, error) {
  res.writeHead(500, {
      'Content-Type': 'text/html'
  });
  res.write('<!doctype html>\n');
  res.write('<title>Internal Server Error</title>\n');
  res.write('<h1>Internal Server Error</h1>');
  res.write('<pre>' + escapeHtml(util.inspect(error)) + '</pre>');
  util.puts('500 Internal Server Error');
  util.puts(util.inspect(error));
};

StaticServlet.prototype.sendMissing_ = function(req, res, path) {
  path = path.substring(1);
  res.writeHead(404, {
      'Content-Type': 'text/html'
  });
  res.write('<!doctype html>\n');
  res.write('<title>404 Not Found</title>\n');
  res.write('<h1>Not Found</h1>');
  res.write(
    '<p>The requested URL ' +
    escapeHtml(path) +
    ' was not found on this server.</p>'
  );
  res.end();
  util.puts('404 Not Found: ' + path);
};

StaticServlet.prototype.sendForbidden_ = function(req, res, path) {
  path = path.substring(1);
  res.writeHead(403, {
      'Content-Type': 'text/html'
  });
  res.write('<!doctype html>\n');
  res.write('<title>403 Forbidden</title>\n');
  res.write('<h1>Forbidden</h1>');
  res.write(
    '<p>You do not have permission to access ' +
    escapeHtml(path) + ' on this server.</p>'
  );
  res.end();
  util.puts('403 Forbidden: ' + path);
};

StaticServlet.prototype.sendRedirect_ = function(req, res, redirectUrl) {
  res.writeHead(301, {
      'Content-Type': 'text/html',
      'Location': redirectUrl
  });
  res.write('<!doctype html>\n');
  res.write('<title>301 Moved Permanently</title>\n');
  res.write('<h1>Moved Permanently</h1>');
  res.write(
    '<p>The document has moved <a href="' +
    redirectUrl +
    '">here</a>.</p>'
  );
  res.end();
  util.puts('301 Moved Permanently: ' + redirectUrl);
};

StaticServlet.prototype.sendFile_ = function(req, res, path) {
  var self = this;
  var file = fs.createReadStream(path);
  res.writeHead(200, {
    'Content-Type': StaticServlet.
      MimeMap[path.split('.').pop()] || 'text/plain'
  });
  if (req.method === 'HEAD') {
    res.end();
  } else {
    file.on('data', res.write.bind(res));
    file.on('close', function() {
      res.end();
    });
    file.on('error', function(error) {
      self.sendError_(req, res, error);
    });
  }
};

StaticServlet.prototype.sendDirectory_ = function(req, res, path) {
  var self = this;
  if (path.match(/[^\/]$/)) {
    req.url.pathname += '/';
    var redirectUrl = url.format(url.parse(url.format(req.url)));
    return self.sendRedirect_(req, res, redirectUrl);
  }
  fs.readdir(path, function(err, files) {
    if (err)
      return self.sendError_(req, res, error);

    if (!files.length)
      return self.writeDirectoryIndex_(req, res, path, []);

    var remaining = files.length;
    files.forEach(function(fileName, index) {
      fs.stat(path + '/' + fileName, function(err, stat) {
        if (err)
          return self.sendError_(req, res, err);
        if (stat.isDirectory()) {
          files[index] = fileName + '/';
        }
        if (!(--remaining))
          return self.writeDirectoryIndex_(req, res, path, files);
      });
    });
  });
};

StaticServlet.prototype.writeDirectoryIndex_ = function(req, res, path, files) {
  path = path.substring(1);
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.write('<!doctype html>\n');
  res.write('<title>' + escapeHtml(path) + '</title>\n');
  res.write('<style>\n');
  res.write('  ol { list-style-type: none; font-size: 1.2em; }\n');
  res.write('</style>\n');
  res.write('<h1>Directory: ' + escapeHtml(path) + '</h1>');
  res.write('<ol>');
  files.forEach(function(fileName) {
    if (fileName.charAt(0) !== '.') {
      res.write('<li><a href="' +
        escapeHtml(fileName) + '">' +
        escapeHtml(fileName) + '</a></li>');
    }
  });
  res.write('</ol>');
  res.end();
};

// Must be last,
main(process.argv);
