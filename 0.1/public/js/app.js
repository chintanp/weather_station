'use strict';


// Declare app level module which depends on filters, and services

// weatherApp is the angular app used in index.html
// No need of filters, services or directives

var weatherApp = angular.module('weatherApp', []).
	config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
		$routeProvider.otherwise({redirectTo: '/view1'});
		$locationProvider.html5Mode(true);
	}]);