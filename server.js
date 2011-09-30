/*
 * Lightweight server for the Vaya Game.
 */

var net = require('net');
var host = process.env.CLIENT_IP || "0.0.0.0"; // Use client host or local.
var port = process.env.PORT || 1337; // Use client port or leet.



/**
 * Player class. Instances represent a player and its socket.
 */
function Player(){
	return this;
}

Player.prototype.init = function(socket){
	this.socket = socket;
	this.id = socket.remoteAddress + socket.remotePort;
	this.room_index = 0;
}



/*
 * Game class. Instances of Game represent a single game session
 */
function Game(){
	return this;
}

Game.prototype.init = function(player,room_size){
	this.players = [];
	this.room_size = room_size;
	
	// On initialization, a user should fill the first spot in the room.
	this.addPlayer(player);
};

Game.prototype.tellPlayers = function(message,exclude){
	if(!exclude){ exclude = false; }
	for (var i = this.players.length - 1; i >= 0; i--){
		if(!exclude || exclude != this.players[i].id){
			this.players[i].socket.write(message);
		}
	};
}

/*
 * Tells each story which game their in, and creates a player.id => game.id 
 * reference in fastPlayerIndex.
 */
Game.prototype.tellPlayersAboutGameIndex = function(index){
	for (var i = this.players.length - 1; i >= 0; i--){
		this.players[i].room_index = index;
		this.players[i].socket.write("You've been moved into game " + index + ".\r\n");
		GameManager.fastPlayerIndex[this.players[i].socket.remoteAddress + this.players[i].socket.remotePort] = index;
	};
}

Game.prototype.addPlayer = function(player){
	if( !self ){ var self = this; }
	
	this.players.push(player);
	
	player.socket.write("You're now in a game! Your id is " + player.id + "\r\n");
	
	if( this.players.length < this.room_size ){
		this.tellPlayers("Now we have to wait for " + ( this.room_size - this.players.length ) + " more players...\r\n");
		return false;
	} else {
		this.tellPlayers("Ready to start the game!\r\n");
		return true;
	}
};



/*
 * Singleton GameManager, manages new players and handles incomming messages.
 */
var GameManager = {
	defaultNumberOfPlayers: 4,
	defaultGameTime: 120,
	runningGames: [],
	openGames:[],
	players: [],
	fastPlayerIndex: [], // player.id => game.id
	
	handleMessage: function(message,socket){
		if(this.runningGames[this.fastPlayerIndex[socket.remoteAddress + socket.remotePort]]){
			this.runningGames[this.fastPlayerIndex[socket.remoteAddress + socket.remotePort]].tellPlayers(message , socket.remoteAddress + socket.remotePort);
		} else {
			socket.write("You're broadcasting, but this game hasn't started yet!\n\r");
		}
	},
	
	createGame: function(player){
		var _new_game = new Game();
		_new_game.init(player, this.defaultNumberOfPlayers);
		this.openGames.push(_new_game);
	},
	
	addPlayer: function(socket){
		if(!self){ var self = this; }
		var _new_player = new Player();
		_new_player.init(socket);
		this.players.push(_new_player);
		
		if(this.openGames.length < 1){
			socket.write("Since there was no game available yet, we're creating a new one for you now!\r\n");
			self.createGame(_new_player);
		} else {
			socket.write("Games exist. We're going to find you a free slot!\r\n");
			if(this.openGames[0].addPlayer(_new_player)){
				/*
				 * This game session starts now. We add the game to the
				 * running game array at a random index, and tell all
				 * players which index that is, for faster navigation
				 * and messaging between players and games later on.
				 */
				var our_index = Math.floor(Math.random()*9999999999);
				this.openGames[0].tellPlayersAboutGameIndex(our_index);
				this.runningGames[our_index] = this.openGames.shift();
			}
		}
	}
}



// The callback function is executed whenever someone connects.
var server = net.createServer(function (socket) {
  socket.write("Welcome player!\r\n");
  socket.setEncoding('ascii'); // Old, but the fastest.
  socket.on("data", function(data){
  	GameManager.handleMessage(data,socket);
  });
  GameManager.addPlayer(socket);
});

// The server should listen to any incomming messages and process these.
server.listen(port, host,function(e){
	console.log('Server wants to listen to ' + host + ':' + port + '.');
	var home = server.address();
	if( host == home.address && port == home.port ){
		console.log('And it actually is!');
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