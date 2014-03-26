weather_station
===============

All the code related to weather station


* tcp_listener.js - Reads data from datalogger - sends to database and to the UI. - Code still not ideal - must be able to update the logic of sensor data parsing and database insert based on the channel definition in datalogger configuration so that the change is reflected everywhere.  
          
* index.html - Displays the sensor data after some bootstraping. Uses jQuery right now, change to AngularJS and make more robust. For some beautiful charts from weather data - patchup with AngularJS with chartJS http://plnkr.co/6UWhFe

