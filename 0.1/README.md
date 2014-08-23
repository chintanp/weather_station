# Angular Express Seed With HTML

This is an Angular / Express seed project is which adapted from Brian Ford's Angular Socket.io Seed (<https://github.com/btford/angular-socket-io-seed>). Credit also goes to Mr. Ford for the intro and how to use sections of this readme.

Instead of using the Jade templating engine; however, this seed uses HTML for markup.

# Intro

Start an awesome app with AngularJS on the front, Socket.io + Express + Node on the back. This project is an application skeleton for writing AngularJS apps that use web sockets to add real-time functionality. If you're not planning on using web sockets, you should consider the Angular Express Seed instead.

The seed contains angular libraries, test libraries and a bunch of scripts all preconfigured for instant web development gratification. Just clone the repo (or download the zip/tarball) and you're ready to develop your application.

The seed app shows how to wire together Angular client-side components with Socket.io and Express on the server

## How to use it

Clone the angular-socket-io-seed repository and start hacking!

### Running the app

Runs like a typical express app:

    node app.js

### Running tests

## Directory Layout
    
    app.js              --> app config
    package.json        --> for npm
    public/             --> all of the files to be used in on the client side
      css/              --> css files
        app.css         --> default stylesheet
      img/              --> image files
      js/               --> javascript files
        app.js          --> declare top-level app module
        controllers.js  --> application controllers
        directives.js   --> custom angular directives
        filters.js      --> custom angular filters
        services.js     --> custom angular services
        lib/            --> angular and 3rd party JavaScript libraries
          angular/
            angular.js            --> the latest angular js
            angular.min.js        --> the latest minified angular js
            angular-*.js          --> angular add-on modules
            version.txt           --> version number
    routes/
      index.js          --> route for serving HTML pages and partials
      socket.js         --> example route for serving data with socket.io
    views/
      index.html        --> main page for app
      partials/         --> angular view partials (partial jade templates)
        partial1.html
        partial2.html



## Example App

A simple [blog](https://github.com/btford/angular-express-blog) based on this seed.


## Contact

For more information on AngularJS please check out http://angularjs.org/
For more on Express and Socket.io, http://expressjs.com/ and http://socket.io/ are
your friends.
