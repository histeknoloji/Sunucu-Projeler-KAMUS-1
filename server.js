/*===========================================================================
	Packages
===========================================================================*/
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser')

//create the app instance
var app = express();

//serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'tmp')));
app.use(express.static(path.join(__dirname, 'test')));
app.use(express.static(path.join(__dirname, 'examples')));

//parse POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.listen(80);	
console.log("Sunucu başlatıldı.")


