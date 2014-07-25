'use strict';

/* Controllers */

/* This controller creates a socket connection with node application that transmits the 
	weather information via http. The controller then parses the received data and adds it 
	to the scope. */

// To understnad what this code does -> http://www.phloxblog.in/real-time-data-update-angular-js-node-js-socket-io/	
//Also http://www.html5rocks.com/en/tutorials/frameworks/angular-websockets/




var weatherApp = angular.module('weatherApp', []);

weatherApp.controller('WeatherDataCtrl', function($scope, socket) { 
  $scope.weatherdata = [];
  
  //Receive weather data from the http socket

  socket.on('livedata', function(data) {
        console.log(data);
        console.log("data.livedata: " + data.livedata);
        
        //Parsing the weather data to get usable information

        var dataArray = data.livedata.split("\r\n");
        console.log("DataArray: " + dataArray);

        //debugger;
        //JSON.stringify(dataArray);

        // console.log("dataRow: " + dataRow);

        // console.log("tyepeof(dataRow): " + typeof(dataRow));

        var dataRow = dataArray.toString().split(",");
        //console.log("dataRow[0]" + dataRow[0]);
        console.log("Length_dataArray = " + dataArray.toString().length);
        console.log("length_dataRow = " + dataRow.length);

        var localObject = [];
        var sensorName = "";
        var sensorValue = "";
        var sensorUnit = "";
        //console.log("dataArray.length-1" + dataArray.length-1);

	  	for(var i = 0; i < dataRow.length - 1; i++) {

	    //console.log(dataArray[i]);
		    if(dataRow[i].split(" ")[0] != '') {
		      sensorName = dataRow[i].split(" ")[0];
		      sensorValue = dataRow[i].split(" ")[1] ;
		      sensorUnit = dataRow[i].split(" ")[2] ;
		      console.log(sensorName + " : " + sensorValue + " : " + sensorUnit );

		      //Creating localObject by parsing the received data
		      localObject.push({"sensor" : sensorName, "value": sensorValue, "unit" : sensorUnit });
		      }  
	  	}

	  	$scope.weatherdata =  localObject;
	  	//debugger;
	  	console.log($scope.weatherdata.length);
    });
});


weatherApp.factory('socket', function($rootScope) {

	//Connect to the socket and expose events

	var socket = io.connect("172.16.12.33:3000");
	return {
		on: function(eventName, callback) {
			socket.on(eventName, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					callback.apply(socket, args);
				});
			});
		}
	};
});
