// Requires StateMachine.js as a dependency.

var KioskGameHandler = {
  width: null,
  height: null,
  
  vizDiv: null,
  gameDiv: null,
  spectatorDiv: null,

  playClock: 2, // not really used
  startClock: 5, // not really used
  
  rulesheet: null,  
  stylesheet: null,
  user_interface: null,
  
  state: null,
  machine: null,  
  
  myRole: null,
  selectedMove: null,
  
  players: null, // not really used
  playerResponses: null, // not really used

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
    //    var playerURL = prompt("What is the URL for the '" + this.matchData.gameRoleNames[i] + "' player?", "");
    //    this.players.push(create_player(playerURL, this.machine));
        this.playerResponses.push(null);        
    }
    
    // Start the match
    //this.writeStartMessages(this.startClock*1000);
    //setTimeout("gameHandler.processResponsesForMatch(true);", 500+this.startClock*1000);    
    
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
    var legals;
  
    if (!gameOver) {
      legals = this.machine.get_legal_moves(this.state, this.machine.get_roles()[this.myRole]);
      if (legals.length <= 1) {
        this.selectedMove = legals[0];
        this.submitMove();
        return;
      }
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
      var inner_args = {};
      var game_parent = this;
      inner_args.viz_div = this.vizDiv;
      inner_args.legals = legals;
      inner_args.selection_callback = function selectionCallback(move) {
        if(!move) move = "";
        
        document.getElementById("clear_move_button").disabled = !move;
        document.getElementById("select_move_button").disabled = !move;
         game_parent.selectedMove = move;
        document.getElementById("status_bar_div").innerHTML = "<b>Selected Move: </b>" + move;
      }
      this.user_interface.attach(inner_args);        
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
  }
}

// NOTE: This function *must* define gameHandler as a global variable.
// Otherwise, sections of the above code will not work.
function load_game (serverName, gameName, myRole, gameDiv, width, height) {  
  gameHandler = Object.create(KioskGameHandler);  
  gameHandler.initialize(serverName, gameName, myRole, gameDiv, width, height);  
  return gameHandler;
}