if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    var F = function () {}
    F.prototype = o;
    return new F();
  }
}

// This allows you to construct a SpectatorView on a web page.
// This requires the following includes in the HEAD of the page:
//   * Channel API: "/_ah/channel/jsapi"
//   * jQuery Library: "//ajax.googleapis.com/ajax/libs/jquery/1.4.4/jquery.min.js"
//
// This also requires the acquisition of a channel token, which
// is stored in the global variable "theChannelToken". This can be
// acquired by including the "channel.js" script in a match directory
// on the spectator server, or by including the "channel.js" in the
// root "matches/" directory on the spectator server (latter method
// is preferred).
var SpectatorView = {
  topDiv: null,
  midDiv: null,
  textDiv: null,
  gameVizDiv: null,
  gameOldVizDiv: null,
  callbacks: null,
  
  rendering: false,
  pending_render: false,
  
  getHeight: function () { return (window.innerHeight - 140) * 0.95; },
  getWidth: function () { return (window.innerWidth - 140) * 0.95; },
  
  state: null,  
  matchData: null,
  stylesheet: null,
  
  visibleStateIndex: null,
  
  VISUAL_VIEW: 0,
  LISTING_VIEW: 1,
  
  // Render the current state of the match, using a
  // smooth transition between old and new states.
  render: function() {
    if (this.rendering) {
      this.pending_render = true;
      return;
    }
    
    var height = this.getHeight();
    var width = this.getWidth();    
    if (height < 100) height = 100;
    if (width < 100) width = 100;    
    if (width < height) height = width;
    if (height < width) width = height;

    this.gameOldVizDiv.innerHTML = this.gameVizDiv.innerHTML;
    this.gameOldVizDiv.style.cssText = this.gameOldVizDiv.style.cssText.replace('display: none; ', '');

    this.gameVizDiv.innerHTML = '';
    StateRenderer.render_state_using_xslt(this.state, this.stylesheet, this.gameVizDiv, width, height);

    this.topDiv.style.height = this.gameVizDiv.children[0].clientHeight + 'px';
    
    this.renderTextPage();

    var thisRef = this;
    this.rendering = true;    
    $(this.gameOldVizDiv).fadeOut('slow', function() {
      thisRef.rendering = false;
      if (thisRef.pending_render) {
        thisRef.pending_render = false;
        thisRef.render();
      }
    });
  },
  
  renderTextPage: function () {
    if (!("moves" in this.matchData) || this.matchData.moves.length == 0) {
      this.textDiv.innerHTML = "";
      return;
    }
    var roleCols = this.matchData.moves[0].length;
    
    textHTML = "<table border=1px><tr height=20px><th rowspan=2>Step</th><th colspan="+roleCols+">Moves</th><th colspan="+roleCols+">Errors</th><th rowspan=2>Time</th></tr>";
    textHTML += "<tr height=20px>";
    for (var i = 0; i < 2; i++) {
      for (var j = 0; j < roleCols; j++) {
        if ("gameRoleNames" in this.matchData) {
          textHTML += "<th>" + this.matchData.gameRoleNames[j] + "</th>";
        } else {
          textHTML += "<th>Player " + j + "</th>";
        }
      }
    }
    textHTML += "</tr>";
    for (var i = 0; i < this.matchData.states.length; i++) {
        textHTML += "<tr height=20px><td>" + i + "</td>";
        for (var j = 0; j < roleCols; j++) {
          if (i > 0) {          
            textHTML += "<td>" + this.matchData.moves[i-1][j] + "</td>";
          } else {
            textHTML += "<td></td>";
          }
        }
        for (var j = 0; j < roleCols; j++) {
          if (("errors" in this.matchData) && (this.matchData.errors.length > i)) {
            textHTML += "<td>" + this.matchData.errors[i][j] + "</td>";
          } else {
            textHTML += "<td>???</td>";
          }
        }
        textHTML += "<td>" + UserInterface.renderDateTime(new Date(this.matchData.stateTimes[i])) + "</td>";
        textHTML += "</tr>";
    }
    textHTML += "</table>";
    this.textDiv.innerHTML = textHTML;
  },
  
  // Given a match data object, return the current state, which is at the end
  // of the ordered list of states in the match.
  getStateFromMatchData: function(m) {
    var z = m.states;
    return SymbolList.symbolListIntoArray(z[z.length-1]);
  },
  
  initialize: function (match_url, spectator_div, callbacks) {
    // First, create the HTML structure for holding the spectator view.
    // This consists of a DIV for the game visualization (gameVizDiv) and
    // a DIV that holds the previous state of the game, which is needed for
    // smooth transitions between states.
    this.topDiv = document.createElement('div');
    this.topDiv.style.cssText = "";
    
    this.midDiv = document.createElement('div');    
    this.midDiv.style.cssText = "position: relative; width: 100%; height: 100%";
    this.textDiv = document.createElement('div');    
    this.textDiv.style.cssText = "position: relative; width: 100%; height: 100%; display: none; ";
    this.textDiv.innerHTML = "";
    
    this.gameVizDiv = document.createElement('div');
    this.gameOldVizDiv = document.createElement('div');
    
    this.gameVizDiv.style.cssText = "position: absolute; top: auto; left: auto; width: 100%; height: 100%; z-index:1;";
    this.gameOldVizDiv.style.cssText = "position: absolute; top: auto; left: auto; width: 100%; height: 100%; z-index:2;";
    
    this.midDiv.appendChild(this.gameVizDiv);
    this.midDiv.appendChild(this.gameOldVizDiv);
    this.topDiv.appendChild(this.midDiv);
    this.topDiv.appendChild(this.textDiv);
    spectator_div.appendChild(this.topDiv);
    
    // Next, load the resources for the match. We need to load the current state,
    // and also the stylesheet associated with the game being played. First, load
    // the current state of the game.
    var matchString = ResourceLoader.load_raw(match_url);
    this.matchData = JSON.parse(matchString);        
    this.state = this.getStateFromMatchData(this.matchData);
    this.visibleStateIndex = this.matchData.states.length-1;
    
    // Next, load the stylesheet associated with the game being played. This involves
    // calling out to the repository server that hosts the game being played.
    var gameURL = this.matchData.gameMetaURL;
    var metadata = ResourceLoader.load_json(gameURL);      
    this.stylesheet = ResourceLoader.load_stylesheet(gameURL + metadata.stylesheet);
    
    // Store the callbacks, and start off by sending back information
    // about the match being loaded to the "info" callback.
    this.callbacks = callbacks;    
    if ("info" in callbacks) {
      var info_response = {};
      info_response.matchId = this.matchData.matchId;
      info_response.description = null;
      if ("description" in metadata) {
        info_response.description = ResourceLoader.load_raw(gameURL + metadata.description);
      }
      callbacks.info(info_response);
    }
    if (this.matchData.isCompleted && "done" in callbacks) {
      callbacks.done();
    }

    // Create a callback that will update the match state based on
    // messages from the browser channel.
    var thisRef = this;
    function update_state_via_channel(channelMessage) {
      var newMatchData = JSON.parse(channelMessage.data);
      if ((newMatchData.matchId != thisRef.matchData.matchId) ||
          (newMatchData.startTime != thisRef.matchData.startTime)) {
        return;
      }
      
      thisRef.state = thisRef.getStateFromMatchData(newMatchData);
      thisRef.visibleStateIndex = newMatchData.states.length-1;
      thisRef.matchData = newMatchData;
      thisRef.render();
      
      if ("update" in thisRef.callbacks) {
        thisRef.callbacks.update();
      }
      if (newMatchData.isCompleted && "done" in thisRef.callbacks) {
        thisRef.callbacks.done();
      }
    }
    
    // Make sure that we're registered to view this match.
    if (match_url[match_url.length-1] != '/') { match_url += '/'; }
    ResourceLoader.load_raw(match_url + 'clientId=' + theChannelID + '/channel.js');

    // Open a Browser Channel to the Spectator Server.
    // We will receive updates to the match state over this channel.
    // We share a global channel with anybody else interested in using
    // a channel to communicate with the spectator server.
    if (window.theGlobalChannel == undefined) {
      window.theGlobalChannel = new goog.appengine.Channel(theChannelToken);
      window.theGlobalChannelCallbacks = [];
      window.theGlobalChannel.open().onmessage = function (x) {
        for (var i = 0; i < window.theGlobalChannelCallbacks.length; i++) {
          window.theGlobalChannelCallbacks[i](x);
        }
      }
    }
    window.theGlobalChannelCallbacks.push(update_state_via_channel);
    
    document.onkeydown = function(e) {
      if (!e) e = window.event;
      key = e.keyCode ? e.keyCode : e.which;      

      if (!thisRef.matchData.isCompleted || thisRef.rendering) {
        return;
      }
      
      // 37 = left, 38 = up, 39 = right, 40 = down
      if (key == 37) {
        if (thisRef.visibleStateIndex > 0) {
          thisRef.visibleStateIndex--;
        }
      }
      if (key == 39) {
        if (thisRef.visibleStateIndex < thisRef.matchData.states.length-1) {
          thisRef.visibleStateIndex++;
        }
      }
      
      if (key == 65) {
        thisRef.switchView(thisRef.VISUAL_VIEW);
      } else if (key == 66) {
        thisRef.switchView(thisRef.LISTING_VIEW);
      }

      thisRef.state = SymbolList.symbolListIntoArray(thisRef.matchData.states[thisRef.visibleStateIndex]);
      thisRef.render();
    }    
  },

  switchView: function (viewID) {
    if (viewID == this.VISUAL_VIEW) {
      this.midDiv.style.display = '';
      this.textDiv.style.display = 'none';
    } else if (viewID == this.LISTING_VIEW) {
      this.midDiv.style.display = 'none';
      this.textDiv.style.display = '';
    }
  },
  
  // Constructor, to make new SpectatorViews.
  construct: function (match_url, spectator_div, spectator_callbacks) {
    var my_spectator_view = Object.create(SpectatorView);
    my_spectator_view.initialize(match_url, spectator_div, spectator_callbacks);
    return my_spectator_view;
  }
}