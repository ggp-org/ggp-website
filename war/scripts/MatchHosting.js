// Requires StateMachine.js as a dependency.

var RemotePlayer = {
  theURL: null,

  writeToPlayer: function (state, messageArray, timeout, responseCallback) {
    ResourceLoader.post_raw_async_with_timeout(this.theURL, SymbolList.arrayIntoSymbolList(messageArray), responseCallback, timeout);
  }
}

var RandomPlayer = {
  myRole: null,
  machine: null,

  writeToPlayer: function (state, messageArray, timeout, responseCallback) {
    if (messageArray[0] == "STOP") return responseCallback("DONE");
    if (messageArray[0] == "START") {
      this.myRole = messageArray[2];
      return responseCallback("READY");
    }

    var legalMoves = this.machine.get_legal_moves(state, this.myRole);
    var randomMove = legalMoves[Math.floor(Math.random()*legalMoves.length)];
    var theResponse = SymbolList.arrayIntoSymbolList(randomMove);
    return responseCallback(theResponse);
  }
}

var HumanPlayer = {
  myRole: null,
  machine: null,
  vizDiv: null,

  writeToPlayer: function (state, messageArray, timeout, responseCallback) {
    if (messageArray[0] == "STOP") return responseCallback("DONE");
    if (messageArray[0] == "START") {
      this.myRole = messageArray[2];
      return responseCallback("READY");
    }

    var legalMoves = this.machine.get_legal_moves(state, this.myRole);
    var randomMove = legalMoves[Math.floor(Math.random()*legalMoves.length)];
    var theResponse = SymbolList.arrayIntoSymbolList(randomMove);
    return responseCallback(theResponse);
  }  
}

function create_player (theURL, machine) {
  var player;
  if (theURL == "random") {
    player = Object.create(RandomPlayer);
    player.machine = machine;
  } else {
    player = Object.create(RemotePlayer);
    player.theURL = theURL;
  }
  return player;
}

var MatchHosting = {
  width: null,
  height: null,

  vizDiv: null,
  gameDiv: null,
  spectatorDiv: null,

  playClock: 2,
  startClock: 5,  

  rulesheet: null,  
  stylesheet: null,
  user_interface: null,  

  state: null,
  machine: null,

  myRole: null, // not really used
  selectedMove: null, // not really used

  players: null,
  playerResponses: null,

  matchData: null,
  spectator: null,

  initialize: function (serverName, gameName, myRole, gameDiv, width, height) {  
    this.width = width;
    this.height = height;

    var gameURL = serverName + "games/" + gameName + "/";
    var metadata = ResourceLoader.load_json(gameURL);

    if ("description" in metadata) {
        var description = ResourceLoader.load_raw(gameURL + metadata.description);
        var desc_div = document.getElementById('desc_div');
        desc_div.innerHTML = '<b>Game Description:</b> ' + description;       
    } else {
        var desc_div = document.getElementById('desc_div');
        if (desc_div) {
            UserInterface.emptyDiv(desc_div);
        }
    }

    var rules_url = gameURL + metadata.rulesheet;
    var style_url = gameURL + metadata.stylesheet;
    var inter_url = gameURL + metadata.user_interface;    
    var gameVersionedURL = gameURL + 'v' + metadata.version + "/";

    this.myRole = myRole;
    this.gameDiv = gameDiv;

    var rule_compound = ResourceLoader.load_rulesheet(rules_url);
    this.stylesheet = ResourceLoader.load_stylesheet(style_url);
    this.rulesheet = rule_compound[1];

    UserInterface.emptyDiv(this.gameDiv);
    this.gameDiv.innerHTML = "<table><tr><td colspan=2><div id='game_viz_div'></div></td></tr><tr><td><div id='status_bar_div'></div></td><td align='right'><div id='button_div'><table><tr><td><button type='button' id='clear_move_button' disabled='true' onclick='gameHandler.clearMove()'>Clear Move</button></td><td><button type='button' id='select_move_button' disabled='true' onclick='gameHandler.submitMove()'>Submit Move</button></td></tr></table></div></td></tr><tr><td colspan=2><div id='spectator_link_div'></div></td></tr></table>";
    this.vizDiv = document.getElementById("game_viz_div");   
    this.spectatorDiv = document.getElementById("spectator_link_div");

    this.machine = load_machine(rule_compound[0])

    this.matchData = {}
    // All of the following remain constant throughout the match
    this.matchData.randomToken = '' + Math.floor(Math.random()*Math.pow(2,64));
    this.matchData.matchId = 'webggp.' + gameName + '.' + new Date().getTime();
    this.matchData.startTime = new Date().getTime();
    this.matchData.gameMetaURL = gameVersionedURL;
    this.matchData.startClock = this.startClock;
    this.matchData.playClock = this.playClock;    
    this.matchData.gameRoleNames = this.machine.get_roles();
    this.matchData.gameName = metadata.gameName;
    // All of the following will change over the course of the match
    this.matchData.states = [];
    this.matchData.moves = [];
    this.matchData.stateTimes = [];
    this.matchData.isCompleted = false;

    this.updateState(this.machine.get_initial_state());    

    this.spectator = make_spectator();
    this.spectator.publish(this.matchData);
    this.spectatorDiv.innerHTML = 'Current match is being published to the <a href="' + this.spectator.link() + '">GGP Spectator Server</a>.';

    // Load the user interface
    this.user_interface = ResourceLoader.load_js(inter_url);    

    // Create the player instances for the game.
    this.players = [];
    this.playerResponses = [];
    for (var i=0; i < this.matchData.gameRoleNames.length; i++) {
        var playerURL = prompt("What is the URL for the '" + this.matchData.gameRoleNames[i] + "' player?", "");
        this.players.push(create_player(playerURL, this.machine));
        this.playerResponses.push(null);        
    }

    // Start the match
    this.writeStartMessages(this.startClock*1000);
    setTimeout("gameHandler.processResponsesForMatch(true);", 500+this.startClock*1000);

    this.renderCurrentState();
  },

  updateState: function (state) {
    this.state = state;
    this.matchData.states.push(SymbolList.arrayIntoSymbolList(state));
    this.matchData.stateTimes.push(new Date().getTime());
    if(this.machine.is_terminal(state)) {
      this.matchData.isCompleted = true;
      this.matchData.goalValues = this.machine.get_goals(state);
    }
  },

  renderCurrentState: function () {
    var gameOver = this.machine.is_terminal(this.state);
    var legals; // not used
    
    if (!gameOver) {
    //legals = this.machine.get_legal_moves(this.state, this.machine.get_roles()[this.myRole]);
    //if (legals.length <= 1) {              <--- not used here, since myRole == null
    //  this.selectedMove = legals[0];
    //  this.submitMove();
    //  return;
    //}
    }    

    UserInterface.emptyDiv(this.vizDiv);
    StateRenderer.render_state_using_xslt(this.state, this.stylesheet, this.vizDiv, this.width, this.height);  
  
    if (gameOver) {
      var scoreText = "<b>Game Over! Scores: ";
      var goals = [];
      var roles = this.machine.get_roles();
      for (var i = 0; i < roles.length; i++) {
        if (i == this.myRole) {
          scoreText += "You";
        } else {
          scoreText += roles[i];
        }
        scoreText += "(" + this.machine.get_goal(this.state, roles[i]) + ") ";
      }
      document.getElementById("status_bar_div").innerHTML = scoreText + "</b>";
      
      document.getElementById("select_move_button").disabled = true;
      document.getElementById("clear_move_button").disabled = true;
    } else {
      //var inner_args = {};
      //var game_parent = this;
      //inner_args.viz_div = this.vizDiv;
      //inner_args.legals = legals;
      //inner_args.selection_callback = function selectionCallback(move) {
      //  if(!move) move = "";

      //  document.getElementById("clear_move_button").disabled = !move;
      //  document.getElementById("select_move_button").disabled = !move;
      //   game_parent.selectedMove = move;
      //  document.getElementById("status_bar_div").innerHTML = "<b>Selected Move: </b>" + move;
      //}
      //this.user_interface.attach(inner_args);        
    }
  },
  
  submitMove: function () {
    if(!this.selectedMove) return;

    document.getElementById("status_bar_div").innerHTML = "<b>Selected Move: </b>";

    var jointMove = this.machine.get_random_joint_moves(this.state);
    jointMove[this.myRole] = this.selectedMove;
    this.matchData.moves.push(SymbolList.arrayIntoSymbolList(jointMove));
    this.updateState(this.machine.get_next_state(this.state, jointMove));
    this.spectator.publish(this.matchData);
    this.spectatorDiv.innerHTML = 'Current match is being published to the <a href="' + this.spectator.link() + '">GGP Spectator Server</a>.';

    this.selectedMove = null;
    this.renderCurrentState();
  },
    
  clearMove: function () {
    this.user_interface.clearSelection();
  },  
  
  // === MATCH HANDLING ===
  processResponsesForMatch: function (justStarted) {
    var jointMove;
    if (!justStarted) {
      // Create the joint move, using random moves for null responses
      jointMove = this.machine.get_random_joint_moves(this.state);
      for(var i = 0; i < this.matchData.gameRoleNames.length; i++) {
        if (this.playerResponses[i]) {
          var legalMoves = this.machine.get_legal_moves(this.state, this.matchData.gameRoleNames[i]);
          for (j in legalMoves) { legalMoves[j] = SymbolList.arrayIntoSymbolList(legalMoves[j]); }
          if (legalMoves.indexOf(SymbolList.arrayIntoSymbolList(this.playerResponses[i])) > -1) {
            jointMove[i] = this.playerResponses[i];
          } else {
            console.log('Got illegal move ' + this.playerResponses[i] + '. Choosing random move for player ' + i);
          }
        } else {
          console.log('Got null response. Choosing random move for player ' + i);
        }
      }
      // Advance to the next state
      this.matchData.moves.push(SymbolList.arrayIntoSymbolList(jointMove));
      this.updateState(this.machine.get_next_state(this.state, jointMove));
      this.spectator.publish(this.matchData);
      this.renderCurrentState();
      // Null out the responses
      for(var i = 0; i < this.matchData.gameRoleNames.length; i++) {
        this.playerResponses[i] = null;
      }
    }
    
    // Ask for the next moves
    if (this.matchData.isCompleted) {
        this.writeToAllPlayers(["STOP", this.matchData.matchId, SymbolList.arrayIntoSymbolList(jointMove)], 500+this.playClock*1000);
    } else {
        this.writeToAllPlayers(["PLAY", this.matchData.matchId, SymbolList.arrayIntoSymbolList(jointMove)], 500+this.playClock*1000);
        setTimeout("gameHandler.processResponsesForMatch(false);", 500+this.playClock*1000);
    }
  },
  
  writeToAllPlayers: function (messageArray, timeout) {
    for(var i = 0; i < this.players.length; i++) {
      this.writeToPlayer(i, messageArray, timeout);
    }
  },
  
  writeStartMessages: function (timeout) {
    for(var i = 0; i < this.players.length; i++) {
      this.writeToPlayer(i, ["START", this.matchData.matchId, this.matchData.gameRoleNames[i], "(" + this.rulesheet + ")", this.startClock, this.playClock], timeout);
    }
  },
  
  writeToPlayer: function (playerIndex, messageArray, timeout) {
    this.players[playerIndex].writeToPlayer(this.state, messageArray, timeout, this.getResponseCallbackForPlayer(playerIndex));
  },
  
  getResponseCallbackForPlayer: function (playerIndex) {
    var x = this;
    return function (response) {
      if (response) {
        x.playerResponses[playerIndex] = SymbolList.symbolListIntoArray(response);
      } else {
        x.playerResponses[playerIndex] = null;
      }
    };
  }
}

// NOTE: This function *must* define gameHandler as a global variable.
// Otherwise, sections of the above code will not work.
function load_game (serverName, gameName, myRole, gameDiv, width, height) {  
  gameHandler = Object.create(MatchHosting);
  gameHandler.initialize(serverName, gameName, myRole, gameDiv, width, height);  
  return gameHandler;
}