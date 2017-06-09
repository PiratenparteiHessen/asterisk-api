// vars
var fs = require('fs'),
    ini = require('ini'),
    config = ini.parse(fs.readFileSync('./config.ini', 'utf-8')),
    express = require('express'),
    app = express(),
    port = process.env.PORT || config.server.port,
    rooms = [],
    rooms_priv = [];


/**
 * port:  port server
 * host: host server
 * username: username for authentication
 * password: username's password for authentication
 * events: this parameter determines whether events are emited.
 **/
var ami = new require('asterisk-manager')(config.asterisk.port, config.asterisk.host, config.asterisk.username, config.asterisk.password, true),
    ac = require('asterisk-config');
 
// In case of any connectiviy problems we got you coverd. 
ami.keepConnected();

// meetme config
var cb = function(err, obj) {
	if (err) {
		console.log(err);
	} else if (obj) {
		//console.log(obj);
		//console.log(obj.rooms);
		//console.log(typeof obj.rooms.vars.conf);

		Object.keys(obj.rooms.vars.conf).forEach(function(key) {
			var room = obj.rooms.vars.conf[key];	
			//console.log(key+" / "+room);
			var room_info = room.split(",");
			//console.log(room_info);
			if (room_info[1] == '0') {
				rooms.push(room_info[0]);
			} else {
				rooms_priv.push(room_info[0]);
			}
		});
		console.log("rooms", rooms);
		console.log("rooms_priv", rooms_priv);
	}
};

ac.getConfigLocal('/etc/asterisk/meetme.conf', cb, {
	varsAsArray: false, 
	duphandlers: {'conf': 'array'}
});

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

	if (rooms_priv.contains(room)) {
		res.json({
			success: false,
			message: 'none public room'
		});
		return;
	}

	if (!rooms.contains(room)) {
		res.json({
			success: false,
			message: 'invalid room'
		});
		return;
	}

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
			success: true,
			listitems: evt.listitems
		};

		res.json(ret);
	}
};

Array.prototype.contains = function(element){
	return this.indexOf(element) > -1;
};
