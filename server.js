/*
 * Lightweight server for the Vaya Game.
 */

var net = require('net');
var host = "0.0.0.0";
var port = process.env.PORT || 3000;
var maintSocket = null; // Will be set on server creation.

// The callback function is executed whenever someone connects.
var server = net.createServer(function (socket) {
  socket.write("Welcome to the server.");
  socket.setEncoding('ascii'); // Old, but the fastest.
  socket.on("data", function(data){
  	console.log(data);
  	socket.write("Tnx for telling me that.");
  });
});

// The server should listen to any incomming messages and process these.
server.listen(port, host,function(e){
	console.log('Ready to receive incomming messages.');
	console.log('Server listening at ' + host + ':' + port);
});


// This checks to ensure a connection is solo.
server.on('error', function (e) {
  if (e.code == 'EADDRINUSE') {
    console.log('Address in use, retrying...');
    setTimeout(function () {
      server.close();
      server.listen(PORT, HOST);
    }, 1000);
  }
});