//This is the script that reads sensor data, sends the sensor data to the db and UI


var net = require('net'),
    http = require('http'),
    port = 7700,                    // Datalogger port
    host = '172.16.105.233',         // Datalogger IP address
    fs = require('fs'),
    // NEVER use a Sync function except at start-up!
    index = fs.readFileSync(__dirname + '/index.html');


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
io.sockets.on('connection', function(socket) {
    socket.emit('welcome', { message: 'Welcome!' });
    socket.on('i am client', console.log);
});

//Create a TCP socket to read data from datalogger
var socket = net.createConnection(port, host);

//Socket Object exposes many events through 'on' - namely 'connect', 'data', 'end', 'error'
socket.on('error', function(error) {
  console.log("Error Connecting");
});

socket.on('connect', function(connect) {
  
  console.log('connection established');
  socket.setEncoding('ascii');
});

socket.on('data', function(data) {
        
  console.log('DATA ' + socket.remoteAddress + ': ' + data);

  io.sockets.emit('livedata', { livedata: data });

  //var weatherdata = data.livedata;
  
  //Parse the output from weather station into local variables that contain individual sensor's values
     
  //Split to get the array
  var dataArray = data.split(",");
                
  //To read about the format of returned string: refer to DT80 manual Pg: 22
  var recordType = dataArray[0];
  var serialNumber = dataArray[1];
  var jobName = dataArray[2];
  var date = dataArray[3];
  var time = dataArray[4];
  var subsec = dataArray[5];
  var realtime = dataArray[6];
  //var schedule = dataArray[7];          //Schedule is preceded by a semi-colon
  var indexFirst = dataArray[7];
  var firstData = dataArray[8];           //Temperature
  var secondData = dataArray[9];         //Humidity
  var thirdData = dataArray[10];          //Atmospheric Pressure
  var fourthData = dataArray[11];         //Internal Temperature
  var fifthData = dataArray[12];          //Wind Direction
  var sixthData = dataArray[13];          //Wind Speed
  var seventhData = dataArray[14];        //Rain    
  var lastData = dataArray[15].split(";");     
  var eighthData = lastData[0];            //Solar Radiation    
  var ninthData = dataArray[17];         //CRC error check   

  //Insert the data in database - as a JSON object. 
  db.raw_data.insert({"date": date, 
                      "time": time, 
                      "subsec": subsec, 
                      "Temperature" : firstData, 
                      "Humidity" : secondData, 
                      "Atmospheric Pressure" : thirdData,
                      "Wind Direction" : fifthData,
                      "Wind Speed" : sixthData,
                      "Rain" : seventhData, 
                      "Solar Radiation" : eighthData
                      }, function(err, saved) {
  if( err || !saved ) console.log("Data not saved");
  else console.log("Data saved");
});
});

socket.on('end', function() {
  console.log('socket closing...');
});
  
app.listen(3000);
