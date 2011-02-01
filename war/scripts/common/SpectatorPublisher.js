if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    var F = function () {}
    F.prototype = o;
    return new F();
  }
}

var SpectatorPublisher = {
  authToken: null,
  initialized: false,
  spectator_link: null,

  initialize: function (matchData) {
    this.authToken = Math.floor((new Date().getTime())*Math.random());
    
    this.spectator_link = 'http://matches.ggp.org/matches/';
    this.spectator_link += matchData.matchId + '.';
    this.spectator_link += matchData.startTime + '.';
    this.spectator_link += matchData.randomToken + '/viz.html';
  },
  
  publish: function(matchData) {
      if (!this.initialized) {
          this.initialize(matchData);
          this.initialized = true;
      }
      
      this.post('http://matches.ggp.org/', JSON.stringify(matchData));    
  },
  
  post: function (url, content) {
    var xhttp = new XMLHttpRequest();      
    xhttp.open("POST", url, false);    
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");    
    xhttp.send("AUTH=" + this.authToken + "&DATA="+content);
  },
  
  link: function () {
    return this.spectator_link;
  }
}

function make_spectator () {
  return Object.create(SpectatorPublisher);
}