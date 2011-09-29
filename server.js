/*
 * Lightweight server for the Vaya Game.
 */

var net = require('net');
var host = process.env.CLIENT_IP || "0.0.0.0"; // Use client host or local.
var port = process.env.PORT || 1337; // Use client port or leet.



/**
 * Game class. Instances of Game represent a single game session
 */
function Game(){
	return this;
}

Game.prototype.tellPlayers = function(message){
	for (var i = this.players.length - 1; i >= 0; i--){
		this.players[i].write(message);
	};
}

Game.prototype.addPlayer = function(player){
	if( !self ){ var self = this; }
	this.players.push(player);
	if( this.players.length < this.room_size ){
		player.write("You're now in a game!\r\n");
		this.tellPlayers("Now we have to wait for " + ( this.room_size - this.players.length ) + " more players...\r\n");
		return false;
	} else {
		this.tellPlayers("Ready to start the game!\r\n");
		return true;
	}
};

Game.prototype.init = function(player,room_size){
	this.players = [];
	this.room_size = room_size;
	
	// On initialization, a user should fill the first spot in the room.
	this.addPlayer(player);
};



/**
 * Singleton GameManager, manages new players and handles incomming messages.
 */
var GameManager = {
	defaultNumberOfPlayers: 4,
	defaultGameTime: 120,
	runningGames: [],
	openGames:[],
	players: [],
	
	handleMessage: function(message){
	},
	
	createGame: function(player){
		var new_game = new Game();
		new_game.init(player, this.defaultNumberOfPlayers);
		this.openGames.push(new_game);
	},
	
	addPlayer: function(socket){
		if(!self){ var self = this; }
		this.players.push(socket);
		
		if(this.openGames.length < 1){
			socket.write("Since there was no game available yet, we're creating a new one for you now!\r\n");
			self.createGame(socket);
		} else {
			socket.write("Games exist. We're going to find you a free slot!\r\n");
			if(this.openGames[0].addPlayer(socket)){
				this.runningGames.push(this.openGames.shift());
			}
		}
	}
}



// The callback function is executed whenever someone connects.
var server = net.createServer(function (socket) {
  socket.write("Welcome player!\r\n");
  socket.setEncoding('ascii'); // Old, but the fastest.
  socket.on("data", function(data){
  	console.log(data);
  	socket.write("Tnx for telling me that.\r\n");
  });
  GameManager.addPlayer(socket);
});

// The server should listen to any incomming messages and process these.
server.listen(port, host,function(e){
	console.log('Server wants to listen to ' + host + ':' + port + '.');
	var home = server.address();
	if( host == home.address && port == home.port ){
		console.log('And it actually is!.');
	} else {
		console.log('Server is actually listening to ' + home.address + ':' + home.port + '.');
	}
	console.log('The server is now ready for communication.');
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