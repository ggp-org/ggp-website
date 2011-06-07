var UserInterface = {
  loadRepositoryGamesIntoMenu: function (theRepoPrefix, theMenu, requirePlayable, requireViewable) {
    function curry(f, x) {
      return function(z) { return f(x, z); };
    }
    function addGameToMenu(key, metadata) {
      var opt = document.createElement("option");
      var meta = JSON.parse(metadata);
      
      // Choose whether to display the game
      if (requirePlayable && !meta.stylesheet) return;
      if (requirePlayable && !meta.user_interface) return;
      if (requireViewable && !meta.stylesheet) return;
      
      // Choose how the display the game
      opt.text = key;
      opt.value = key;      
      if (meta.gameName){
        opt.text = meta.gameName;
      }
      
      // Add the game to the menu
      theMenu.options.add(opt);
    }

    /*
    var games_listing = ResourceLoader.load_json(theRepoPrefix + 'games/');
    games_listing.sort();    
    for (var i = 0; i < games_listing.length; i++) {
      ResourceLoader.load_raw_async_with_timeout(theRepoPrefix + 'games/' + games_listing[i] + '/', curry(addGameToMenu, games_listing[i]), 60000);
    }
    */
    
    // This uses a single resource request, that pulls in all of the accumulated
    // game metadata files for all available games. This should be faster than asking
    // for every game metadata file individually, but it's not 100% clear that we want
    // to require that repository servers support this "bulk metadata" request, so it
    // may break in the future.
    var games_metadata = ResourceLoader.load_json(theRepoPrefix + 'games/metadata');
    var gameNames = [];
    for (var gameName in games_metadata) {
      gameNames.push(gameName);
    }
    gameNames.sort();
    for (var i = 0; i < gameNames.length; i++) {
      addGameToMenu(gameNames[i], JSON.stringify(games_metadata[gameNames[i]]));
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

  logError: function (x) {
    console.log(x);
    var logDiv = document.getElementById("log_div");
    if (logDiv) logDiv.innerHTML += "<br>" + x;
  },
  
  clearErrors: function () {
    var logDiv = document.getElementById("log_div");
    if (logDiv) logDiv.innerHTML = "";
  },
  
  renderDateTime: function(d) {    
    var suffix = "AM";
    var hours = d.getHours()
    var minutes = d.getMinutes()  
    if (hours >= 12) { suffix = "PM"; hours = hours - 12; }
    if (hours == 0) { hours = 12; }
    if (minutes < 10) { minutes = "0" + minutes; }

    var out = "";
    out += hours + ":" + minutes + " " + suffix + " on ";
    out += (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear();
    return out;
  },
  
  // Currently this correctly renders names for [-9,9].
  // Since it's currently only used for rendering names for
  // the number of roles in a given game, that range is sufficient.
  // It shouldn't be difficult to expand if needed.
  properNameForInteger: function (x) {
      if (x < 0) return "Negative " + properNameForInteger(-x);
      
      if (x == 0) return "Zero";
      if (x == 1) return "One";
      if (x == 2) return "Two";
      if (x == 3) return "Three";
      if (x == 4) return "Four";
      if (x == 5) return "Five";
      if (x == 6) return "Six";
      if (x == 7) return "Seven";
      if (x == 8) return "Eight";
      if (x == 9) return "Nine";
      return "Ten+";
    }
}