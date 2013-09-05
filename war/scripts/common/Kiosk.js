"use strict";

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
  user_interface: null,
  renderStateCallback: null,
  
  selectedMove: null,
  liveSubmitCallback: null,

  writeToPlayer: function (state, messageArray, timeout, responseCallback) {
    if (messageArray[0] == "STOP") return responseCallback("DONE");
    if (messageArray[0] == "START") {
      this.myRole = messageArray[2];
      return responseCallback("READY");
    }

    var legalMoves = this.machine.get_legal_moves(state, this.myRole);
    if (legalMoves.length == 1) {    
      var theResponse = SymbolList.arrayIntoSymbolList(legalMoves[0]);
      return responseCallback(theResponse);
    }

    this.selectedMove = null;
    this.liveSubmitCallback = responseCallback;

    // Create a user interface and attach it to the visualization      
    var inner_args = {};
    var game_parent = this;
    inner_args.viz_div = this.vizDiv;
    inner_args.legals = legalMoves;
    inner_args.selection_callback = function selectionCallback(move) {
      if(!move) move = "";

      document.getElementById("clear_move_button").disabled = !move;
      document.getElementById("select_move_button").disabled = !move;
      game_parent.selectedMove = move;
      document.getElementById("status_bar_div").innerHTML = "<b>Selected Move: </b>" + move;
    }
    if (this.user_interface) {
      this.user_interface.attach(inner_args);
    }
  },
  
  submitMove: function () {
    if(!this.selectedMove) return;
    document.getElementById("status_bar_div").innerHTML = "<b>Selected Move: </b>";
    document.getElementById("clear_move_button").disabled = true;
    document.getElementById("select_move_button").disabled = true;    
    
    var myMove = this.selectedMove;
    var myCallback = this.liveSubmitCallback;

    this.selectedMove = null;
    this.liveSubmitCallback = null;    
    
    this.renderStateCallback();
    
    myCallback(SymbolList.arrayIntoSymbolList(myMove));
  },
      
  clearMove: function () {
    if (this.user_interface) {
      this.user_interface.clearSelection();
    }
  }
}

function create_player (theURL, machine, vizDiv, user_interface, renderStateCallback) {
  var player;
  if (theURL == "random") {
    player = Object.create(RandomPlayer);
    player.machine = machine;
  } else if (theURL == "me") {
    player = Object.create(HumanPlayer);
    player.vizDiv = vizDiv;
    player.machine = machine;
    player.user_interface = user_interface;
    player.renderStateCallback = renderStateCallback;
  } else {
    player = Object.create(RemotePlayer);
    player.theURL = theURL;
  }
  return player;
}

var Kiosk = {
  width: null,
  height: null,

  vizDiv: null,
  gameDiv: null,
  spectatorDiv: null,

  playClock: null,
  startClock: null,

  rulesheet: null,  
  stylesheet: null,
  user_interface: null,  

  state: null,
  machine: null,

  humanPlayer: null,

  players: null,
  playerResponses: null,

  matchData: null,
  spectator: null,
  
  matchJustStarted: null,

  initialize: function (serverName, gameName, playerURLs, startClock, playClock, gameDiv, width, height) {  
    this.width = width;
    this.height = height;
    
    this.playClock = playClock;
    this.startClock = startClock;    

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
    var gameVersionedURL = gameURL + 'v' + metadata.version + "/";

    this.gameDiv = gameDiv;

    var rule_compound = ResourceLoader.load_rulesheet(rules_url);
    this.stylesheet = ResourceLoader.load_stylesheet(style_url);
    this.rulesheet = rule_compound[1];

    UserInterface.emptyDiv(this.gameDiv);
    this.gameDiv.innerHTML = "<table><tr><td colspan=2><div id='spectator_link_div'></div></td></tr><tr><td colspan=2><div id='game_viz_div'></div></td></tr><tr><td><div id='status_bar_div'></div></td><td align='right'><div id='button_div'><table><tr><td><button type='button' id='clear_move_button' disabled='true' onclick='gameHandler.humanPlayer.clearMove()'>Clear Move</button></td><td><button type='button' id='select_move_button' disabled='true' onclick='gameHandler.humanPlayer.submitMove()'>Submit Move</button></td></tr></table></div></td></tr></table>";
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
    this.matchData.errors = [];
    this.matchData.stateTimes = [];
    this.matchData.isCompleted = false;

    this.updateState(this.machine.get_initial_state());
    
    this.spectator = make_spectator();
    this.spectatorDiv.innerHTML = 'Current match is being published to...';    
    
    UserInterface.clearErrors();

    // Load the user interface
    if ("user_interface" in metadata) {
      this.user_interface = ResourceLoader.load_js(gameURL + metadata.user_interface);
      
      // Attach keybindings for the buttons the Kiosk interface renders
      if (!this.hasKeyBindings) {
        var thisRef = this;
        var oldkeydown = document.onkeydown;
        document.onkeydown = function(e) { thisRef.onkeydown(e); if (oldkeydown) oldkeydown(e); }
        this.hasKeyBindings = true;
      }
    }

    // Create the player instances for the game.
    var parent = this;
    this.players = [];
    this.playerResponses = [];
    for (var i=0; i < this.matchData.gameRoleNames.length; i++) {
      var playerURL = playerURLs[i];
      var thePlayer = create_player(playerURL, this.machine, this.vizDiv, this.user_interface, function () { parent.renderCurrentState(); });
      this.players.push(thePlayer);
      this.playerResponses.push(null);
      if (playerURL == "me") {
        this.humanPlayer = thePlayer;
      }
    }

    // Start the match
    this.writeStartMessages(500+this.startClock*1000);
    this.matchJustStarted = true;

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

    UserInterface.emptyDiv(this.vizDiv);
    StateRenderer.render_state_using_xslt(this.state, this.stylesheet, this.vizDiv, this.width, this.height);  
  
    if (gameOver) {
      var scoreText = "<b>Game Over! Scores: ";
      var goals = [];
      var roles = this.machine.get_roles();
      for (var i = 0; i < roles.length; i++) {
        if (this.humanPlayer != null && i == this.humanPlayer.myRole) {
          scoreText += "You";
        } else {
          scoreText += roles[i];
        }
        scoreText += "(" + this.machine.get_goal(this.state, roles[i]) + ") ";
      }
      document.getElementById("status_bar_div").innerHTML = scoreText + "</b>";
      
      document.getElementById("select_move_button").disabled = true;
      document.getElementById("clear_move_button").disabled = true;
    }
  },
  
  // === KEY BINDINGS ===
  hasKeyBindings: false,
  onkeydown: function (e) {
    if (e.which == 13 && gameHandler.humanPlayer) {
      gameHandler.humanPlayer.submitMove();
    } else if (e.which == 27 && gameHandler.humanPlayer) {
      gameHandler.humanPlayer.clearMove();
    }
  },  

  // === MATCH HANDLING ===
  checkForAllMoves: function () {
    var allMovesSubmitted = true;
    for(var i = 0; i < this.playerResponses.length; i++) {
      if (this.playerResponses[i] == null) {
        allMovesSubmitted = false;
      }
    }
    if (allMovesSubmitted && !this.waitingForProcessResponse) {
      this.waitingForProcessResponse = true;
      setTimeout("gameHandler.processResponsesForMatch();", 250);
    }
  },
  
  waitingForProcessResponse: false,

  processResponsesForMatch: function () {
    this.waitingForProcessResponse = false;
    if (this.matchData.isCompleted) return;

    // If we haven't just started the match, we should take the player
    // responses and formulate a joint move based on them. We should then
    // advance the state of the match based on that joint move, and then
    // broadcast the joint move to all of the players.    
    var jointMove;
    var jointErrors = [];
    if (!this.matchJustStarted) {
      jointMove = this.machine.get_random_joint_moves(this.state);
      for(var i = 0; i < this.matchData.gameRoleNames.length; i++) {
        if (this.playerResponses[i]) {
          var legalMoves = this.machine.get_legal_moves(this.state, this.matchData.gameRoleNames[i]);
          for (var j in legalMoves) { legalMoves[j] = SymbolList.arrayIntoSymbolList(legalMoves[j]); }
          if (legalMoves.indexOf(SymbolList.arrayIntoSymbolList(this.playerResponses[i])) > -1) {
            jointMove[i] = this.playerResponses[i];
            jointErrors.push("");
          } else {
            UserInterface.logError('Got illegal move ' + this.playerResponses[i] + '. Choosing random move for player ' + i);
            jointErrors.push("IL " + this.playerResponses[i]);
          }
        } else {
          UserInterface.logError('Got null response. Choosing random move for player ' + i);
          jointErrors.push("CE");
        }
      }
      // Advance to the next state
      this.matchData.moves.push(jointMove);
      this.matchData.errors.push(jointErrors);
      this.updateState(this.machine.get_next_state(this.state, jointMove));
      this.spectator.publish(this.matchData);
      this.renderCurrentState();
    } else {
      // First move: just make sure that they've sent a reply to the START command.
      for(var i = 0; i < this.matchData.gameRoleNames.length; i++) {
        if (this.playerResponses[i]) {
          jointErrors.push("");
        } else {
          UserInterface.logError('Got null response to START from player ' + i);
          jointErrors.push("CE");
        }
      }
      this.matchData.errors.push(jointErrors);
      this.spectator.publish(this.matchData);
      this.spectatorDiv.innerHTML = 'Current match is being published to the <a href="' + this.spectator.link() + '">GGP Spectator Server</a>.';
    }
    
    // Null out the responses
    for(var i = 0; i < this.playerResponses.length; i++) {
      this.playerResponses[i] = null;
    }    

    // Ask for the next moves
    this.matchJustStarted = false;
    if (this.matchData.isCompleted) {
      this.writeToAllPlayers(["STOP", this.matchData.matchId, SymbolList.arrayIntoSymbolList(jointMove)], 500+this.playClock*1000);
    } else {
      this.writeToAllPlayers(["PLAY", this.matchData.matchId, SymbolList.arrayIntoSymbolList(jointMove)], 500+this.playClock*1000);
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
        x.playerResponses[playerIndex] = "";
      }
      x.checkForAllMoves();
    };
  }
}

// NOTE: This function *must* define gameHandler as a global variable.
// Otherwise, sections of the above code will not work.
var gameHandler = null;
function load_kiosk (serverName, gameName, playerURLs, startClock, playClock, gameDiv, width, height) {  
  gameHandler = Object.create(Kiosk);
  gameHandler.initialize(serverName, gameName, playerURLs, startClock, playClock, gameDiv, width, height);  
  return gameHandler;
}