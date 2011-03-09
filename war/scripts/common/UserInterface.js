var UserInterface = {
  loadRepositoryGamesIntoMenu: function (theRepoPrefix, theMenu, requirePlayable) {
    function curry(f, x) {
      return function(z) { return f(x, z); };
    }
    function addGameToMenu(key, metadata) {
      var opt = document.createElement("option");
      var meta = JSON.parse(metadata);
      
      // Choose whether to display the game
      if (requirePlayable && !meta.stylesheet) return;
      if (requirePlayable && !meta.user_interface) return;
      
      // Choose how the display the game
      opt.text = key;
      opt.value = key;      
      if (meta.gameName){
        opt.text = meta.gameName;
      }
      
      // Add the game to the menu
      theMenu.options.add(opt);
    }
    
    var games_listing = ResourceLoader.load_json(theRepoPrefix + 'games/');
    games_listing.sort();    
    for (var i = 0; i < games_listing.length; i++) {
      ResourceLoader.load_raw_async_with_timeout(theRepoPrefix + 'games/' + games_listing[i] + '/', curry(addGameToMenu, games_listing[i]), 60000);
    }
  },
  
  emptyDiv: function (divToClear) {
    var i;
    while (i = divToClear.childNodes[0]){
      if (i.nodeType == 1 || i.nodeType == 3){
        divToClear.removeChild(i);
      }
    }
  }
}