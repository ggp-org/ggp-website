if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    var F = function () {}
    F.prototype = o;
    return new F();
  }
}

var SpectatorPublisher = {
  authToken: null,
  spectator_link: null,

  publish: function(matchData) {
      if (this.authToken == null) {
          this.authToken = Math.floor((new Date().getTime())*Math.random());
      }

      var contentToPost = "AUTH=" + this.authToken + "&DATA="+JSON.stringify(matchData);
      var matchIdentifier = ResourceLoader.post_raw("http://matches.ggp.org/", contentToPost, "application/x-www-form-urlencoded");
      this.spectator_link = 'http://matches.ggp.org/matches/' + matchIdentifier + '/viz.html';
  },
  
  link: function () {
    return this.spectator_link;
  }
}

function make_spectator () {
  return Object.create(SpectatorPublisher);
}