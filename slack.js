var https = require('https');

var hapi = require('hapi');

var config = require('./config');

var mqttClient;

module.exports = {
	startServer: function(client) {
		mqttClient = client;
		server.start();
		console.log("Slack webhook listener started")
	},

	postToSlack: function(payload) {
		console.log("posting mqtt to slack");

		var body = JSON.stringify({
			text: payload.ID + ': ' + payload.text,
			username: 'Chat Boterick'
		});

		var options = {
			host: config.slack.host,
			path: '/services/hooks/incoming-webhook?token=' + config.slack.incomingToken,
			port: 443,
			method: 'POST'
		};

		var req = https.request(options, function(res) {
			res.setEncoding('utf8');
			res.on('data', function(data) {
				console.log(data);
			});
		});

		req.write(body);
		req.end();
	}
};

var server = new hapi.Server('0.0.0.0', config.slack.port, {
	cors: true
});

server.route({
	path: '/',
	method: 'POST',
	handler: function(req, reply) {
		console.log("/ POST request received");
		if (req.payload.token == config.slack.outgoingToken) {
			handleSlackMessage(req.payload);
		}
		else {
			console.log("invalid token");
		}
	}
});

server.route({
	path: '/email',
	method: 'POST',
	handler: function(req, reply) {
		console.log("/email POST request received");
		console.log(req.payload);
		createZendeskTicket(req.payload);
		reply("okay").code(200);
	}
});

server.route({
	path: '/',
	method: 'GET',
	handler: function(req, reply) {
		console.log("/ GET request received");
		reply('Are you lost?').code(200);
	}
});

function handleSlackMessage(payload) {
	//take out the trigger word, split up the message, extract the ID
	var triggerless = payload.text.slice(payload.trigger_word.length);
	var split = triggerless.split(' ');
	var ID;
	if (split[0].indexOf(':' > -1)) {
		ID = split[0].substring(0, 8);
	}
	else {
		ID = split[0];
	}
	split = split.slice(1);
	var message = split.join(' ');

	console.log(message + ' and then ' + ID);

	var messagejson = JSON.stringify({
		text: message,
		ID: ID,
		sender: '2lemetry'
	});

	mqttClient.publish(config.mqtt.topic+'/'+ID, messagejson);
}

function createZendeskTicket(payload) {
	// var info = payload;
	// var body = JSON.stringify({
	// 	ticket: {
	// 		requester: {
	// 			name: info.name,
	// 			email: info.email
	// 		},
	// 		subject: info.subject,
	// 		comment: {
	// 			body: info.message
	// 		}
	// 	}
	// });

	// var auth = new Buffer(config.zendesk.email+'/token:'+config.zendesk.token).toString('base64');
	// var options = {
	// 	host: config.zendesk.host,
	// 	port: 443,
	// 	path: '/api/v2/tickets.json',
	// 	method: 'POST',
	// 	headers: {
	// 		'Content-Type': 'application/json',
	// 		'Authorization': 'Basic ' + auth
	// 	}
	// };

	// var req = https.request(options, function(res) {
	// 	res.setEncoding('utf8');
	// 	res.on('data', function(data) {
	// 		console.log(data);
	// 	});
	// });

	// req.write(body);
	// req.end();

}
