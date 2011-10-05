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
	this.x = null; // Float
	this.y = null; // Float
	this.orientation = null; // Float
}



/*
 * Game class. Instances of Game represent a single game session
 */
function Game(){
	return this;
}

Game.prototype.init = function(player,room_size){
	if(!self){ var self = this; }
	this.players = [];
	this.room_size = room_size;
	this.running = false;
	
	this.addPlayer(player);
	this.positions = Object();
	setInterval(function(){self.sendPositions();},33);
};

Game.prototype.sendPositions = function(){
	if(this.running){
		console.log(JSON.stringify(this.positions));
		this.tellPlayers(this.positions);
	}
}

Game.prototype.tellPlayers = function(message,exclude){
	if(!exclude){ exclude = false; }
	
	if(typeof message !== 'string'){
		message = JSON.stringify(message) + "\r\n";
	} 

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
		this.players[i].socket.write('{"type":"message","message":"Het spel gegint, je zit in spel ' + index + '."}\r\n');
		GameManager.fastPlayerIndex[this.players[i].socket.remoteAddress + this.players[i].socket.remotePort] = index;
	};
}

Game.prototype.handleMessage = function(message,from){
	//console.log("Incomming message.");
	messages = message.split("\n");
	last = messages.length;
	message = messages[last - 2];
	var message_object = JSON.parse(message);
	switch(message_object.type){
		case "position_update": // {"type":"position_update","position":{"x":100,"y":100,"angle":180}}
			this.handlePositionUpdates(message_object.position,from);
			break;
		case "player_got_obj":
			this.tellPlayers(message_object,from);
			break;
		case "player_dropped_obj":
			this.tellPlayers(message_object,from);
			break;
		default:
			console.log("Unknown type!");
			break;
	}
}

Game.prototype.handlePositionUpdates = function(position,from){
	if(this.positions[from]) {
		this.positions[from] = position;
	} else {
		this.positions[from] = position;
	}
}

Game.prototype.addPlayer = function(player){
	if( !self ){ var self = this; }
	
	this.players.push(player);
	
	player.socket.write('{"type":"player_id","id":"' + player.id + '"}\r\n');
	
	if( this.players.length < this.room_size ){
		this.tellPlayers('{"type":"message","message":"We wachten nog op ' + ( this.room_size - this.players.length ) + ' spelers..."}\r\n');
		return false;
	} else {
		//this.tellPlayers("Ready to start the game!\r\n");
		this.tellPlayers('{"type":"directive","directive":"start"}\r\n'); // Fires START on clients. 
		this.tellPlayers("\r\n");
		return true;
	}
};



/*
 * Singleton GameManager, manages new players and handles incomming messages.
 */
var GameManager = {
	defaultNumberOfPlayers: 2,
	defaultGameTime: 120,
	runningGames: [],
	openGames:[],
	players: [],
	fastPlayerIndex: [], // player.id => game.id
	
	handleMessage: function(message,socket){
		if(this.runningGames[this.fastPlayerIndex[socket.remoteAddress + socket.remotePort]]){
			this.runningGames[this.fastPlayerIndex[socket.remoteAddress + socket.remotePort]].handleMessage(message , socket.remoteAddress + socket.remotePort);
		} else {
			socket.write('{"type":"message","message":"Je praat tegen een gesloten spel, dat gaat niet!"}\r\n');
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
			socket.write('{"type":"message","message":"Er is nog geen spel begonnen, we starten een nieuw spel voor je."}\r\n');
			self.createGame(_new_player);
		} else {
			socket.write('{"type":"message","message":"We plaatsen je bij een bestaand spel."}\r\n');
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
				this.runningGames[our_index].running = true;
			}
		}
	},
	
	discartPlayer: function(socket){
		if(!self){ var self = this; }
		var target = null;
		
		for (var i = this.players.length - 1; i >= 0; i--){
			if(self.players[i].id == socket.remoteAddress + socket.remotePort){
				target = self.players[i];
			} 
		};
		
		if(this.fastPlayerIndex[target.id]){
			
			var index = self.runningGames[this.fastPlayerIndex[target.id]].players.indexOf(target); 
			self.runningGames[this.fastPlayerIndex[target.id]].players.splice(index,1);
			self.runningGames[this.fastPlayerIndex[target.id]].tellPlayers("A player left.");
			
		} else {
			
			var index = self.openGames[0].players.indexOf(target);
			self.openGames[0].players.splice(index,1);
			self.openGames[0].tellPlayers('{"type":"message","message":"Er is een speler weggegaan. We wachten nu op ' + ( this.room_size - this.players.length ) + ' spelers."}\r\n');
		}
	}
}



// The callback function is executed whenever someone connects.
var server = net.createServer(function (socket) {
  socket.write('{"type":"message","message":"Welkom speler!"}\r\n');
  socket.setEncoding('ascii'); // Old, but the fastest.
  socket.on("close", function(){
  	GameManager.discartPlayer(socket);
  });
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