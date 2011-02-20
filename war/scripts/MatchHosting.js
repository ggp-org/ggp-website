// Requires StateMachine.js as a dependency.

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
  
  playerURLs: null,
  playerResponses: null,
  
  state: null,
  machine: null,
  
  matchData: null,
  
  parent: null,
  
  spectator: null,

  initialize: function (parent, serverName, gameName, gameDiv, width, height) {  
    this.width = width;
    this.height = height;
    this.parent = parent;
    
    var gameURL = serverName + "games/" + gameName + "/";
    var metadata = parent.ResourceLoader.load_json(gameURL);

    if ("description" in metadata) {
        var description = ResourceLoader.load_raw(gameURL + metadata.description);
        var desc_div = document.getElementById('desc_div');
        desc_div.innerHTML = '<b>Game Description:</b> ' + description;       
    } else {
        var desc_div = document.getElementById('desc_div');
        if (desc_div) {
            this.emptyDiv(desc_div);
        }
    }
    
    var rules_url = gameURL + metadata.rulesheet;
    var style_url = gameURL + metadata.stylesheet;
    var inter_url = gameURL + metadata.user_interface;    
    var gameVersionedURL = gameURL + 'v' + metadata.version + "/";

    this.gameDiv = gameDiv;

    var rule_compound = parent.ResourceLoader.load_rulesheet(rules_url);
    this.stylesheet = parent.ResourceLoader.load_stylesheet(style_url);
    this.rulesheet = rule_compound[1];

    this.emptyDiv(this.gameDiv);
    this.gameDiv.innerHTML = "<table><tr><td><div id='game_viz_div'></div></td></tr><tr><td><div id='score_div'></div></td></tr><tr><td><div id='spectator_link_div'></div></td></tr></table>";
    this.vizDiv = document.getElementById("game_viz_div");   
    this.spectatorDiv = document.getElementById("spectator_link_div");
    
    this.machine = load_machine(rule_compound[0])
    
    this.matchData = {}
    // All of the following remain constant throughout the match
    this.matchData.randomToken = '' + Math.floor(Math.random()*Math.pow(2,64));
    this.matchData.matchId = 'webggp.' + gameName + '.' + new Date().getTime();
    this.matchData.startTime = new Date().getTime();
    this.matchData.gameMetaURL = gameVersionedURL;
    this.matchData.startClock = 0;
    this.matchData.playClock = 0;    
    this.matchData.gameRoleNames = this.machine.get_roles();
    this.matchData.gameName = metadata.gameName;
    // All of the following will change over the course of the match
    this.matchData.states = [];
    this.matchData.moves = [];
    this.matchData.stateTimes = [];
    this.matchData.isCompleted = false;

    this.updateState(this.machine.get_initial_state());
    
    this.playerURLs = [];
    this.playerResponses = [];
    for (var i=0; i < this.matchData.gameRoleNames.length; i++) {
        this.playerURLs.push(prompt("What is the URL for the '" + this.matchData.gameRoleNames[i] + "' player?", ""));
        this.playerResponses.push(null);
    }
    
    this.spectator = make_spectator();
    this.spectator.publish(this.matchData);
    this.spectatorDiv.innerHTML = 'Current match is being published to the <a href="' + this.spectator.link() + '">GGP Spectator Server</a>.';

    this.renderCurrentState();
    
    // Start the match
    this.writeStartMessages(this.startClock*1000);
    setTimeout("gameHandler.processResponsesForMatch(true);", 500+this.startClock*1000);
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

  emptyDiv: function (divToClear) {
    var i;
    while (i = divToClear.childNodes[0]){
      if (i.nodeType == 1 || i.nodeType == 3){
        divToClear.removeChild(i);
      }
    }
  },

  renderCurrentState: function () {
    var gameOver = this.machine.is_terminal(this.state);

    this.emptyDiv(this.vizDiv);
    this.parent.StateRenderer.render_state_using_xslt(this.state, this.stylesheet, this.vizDiv, this.width, this.height);  
  
    if (gameOver) {
      var scoreText = "<b>Game Over! Scores: ";
      var goals = [];
      var roles = this.machine.get_roles();
      for (var i = 0; i < roles.length; i++) {
          scoreText += roles[i] + "(" + this.machine.get_goal(this.state, roles[i]) + ") ";
      }
    
      document.getElementById("score_div").innerHTML = scoreText + "</b>";      
    }
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
    for(var i = 0; i < this.playerURLs.length; i++) {
      this.writeToPlayer(i, messageArray, timeout);
    }
  },
  
  writeStartMessages: function (timeout) {
    for(var i = 0; i < this.playerURLs.length; i++) {
      this.writeToPlayer(i, ["START", this.matchData.matchId, this.matchData.gameRoleNames[i], "(" + this.rulesheet + ")", this.startClock, this.playClock], timeout);
    }
  },
  
  writeToPlayer: function (playerIndex, messageArray, timeout) {
    parent.ResourceLoader.post_raw_async_with_timeout(this.playerURLs[playerIndex], SymbolList.arrayIntoSymbolList(messageArray), this.getResponseCallbackForPlayer(playerIndex), timeout);
    //parent.ResourceLoader.load_raw_async_with_timeout(this.playerURLs[playerIndex] + encodeURIComponent(SymbolList.arrayIntoSymbolList(messageArray)), this.getResponseCallbackForPlayer(playerIndex), timeout);    
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
function load_game (serverName, gameName, gameDiv, width, height) {  
  gameHandler = Object.create(MatchHosting);
  gameHandler.initialize(this, serverName, gameName, gameDiv, width, height);  
  return gameHandler;
}