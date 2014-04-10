To use the app:

1. Install node. 
  
2. Download angular-seed from https://github.com/angular/angular-seed/tree/v0.10.x  -- This is the old version of angular-seed.     

3. Locate the file /scripts/web-server.js and replace with the one provided here. Change the file /app/js/controller.js with the one provided here. Change file /app/index.html with the one provided here.


4. Run node /scripts/web-server.js to run the server from the base directory. This server up all the pages and also retrieves data from the datalogger. 

5. Install mongodb and run mongod --dbpath "path-to-db", to save the data to the database. 

6. Open chrome to http://localhost:8000/app/index.html, and see the angular app in action. 

Troubleshooting: 


1. Check the IP address of the datalogger in the web-server.js file. 

2. The data returned from the datalogger should in the human-readable format. i.e. \h switch, this is the default. 





