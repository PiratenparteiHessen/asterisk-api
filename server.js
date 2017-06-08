// vars
var fs = require('fs'),
    ini = require('ini'),
    config = ini.parse(fs.readFileSync('./config.ini', 'utf-8')),
    express = require('express'),
    app = express(),
    port = process.env.PORT || config.server.port;


/**
 * port:  port server
 * host: host server
 * username: username for authentication
 * password: username's password for authentication
 * events: this parameter determines whether events are emited.
 **/
var ami = new require('asterisk-manager')(config.asterisk.port, config.asterisk.host, config.asterisk.username, config.asterisk.password, true); 
 
// In case of any connectiviy problems we got you coverd. 
ami.keepConnected();


// express
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Generate a v4 UUID (random) 
const uuidV4 = require('uuid/v4');

// routes
app.get('/meetmelist/:room', function(req, res) {
	//console.log("req", req);
	//console.log("res", res);
	var room = req.params.room;
	console.log("/meetmelist/"+room);

	var uuid = uuidV4();

	ami.addListener('managerevent', queryMeetme.bind(null, uuid, res));

	// Perform an AMI Action. A list of actions can be found at 
	// https://wiki.asterisk.org/wiki/display/AST/AMI+Actions
	ami.action({
		'action': 'meetmelist',
		'actionid': uuid,
		'conference': room
	}, function(err, res) {
	});
});

// start express
app.listen(port);
console.log('Server started! At http://localhost:' + port);


var queryMeetme = function(uuid, res, evt) {
	/*
	console.log("evt", evt);
	console.log("uuid", uuid);
	console.log("res", res);
	*/

	if (evt.actionid == uuid && evt.event == 'MeetmeListComplete') {
		console.log("evt", evt);
                        
		ami.removeListener('managerevent', queryMeetme);
                        
		var ret = {
			listitems: evt.listitems
		};

		res.json(ret);
	}
};
