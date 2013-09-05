"use strict";

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
  
  renderDuration: function(x) {
      if (x <= 0) return "0s";
      
      var s = Math.round(x/1000);
      var sV = "" + (s % 60);
      
      var m = Math.floor(s/60);
      var mV = "" + (m % 60);
      
      var h = Math.floor(m/60);
      var hV = "" + h;
      
      if (m != 0) {
          while (sV.length < 2) sV = "0" + sV;
      }
      if (h != 0) {
          while (mV.length < 2) mV = "0" + mV;
          while (sV.length < 2) sV = "0" + sV;
      }

      hV += ":";
      mV += ":";
      
      if (h == 0) {
        if (m == 0) {
          mV = "";
          sV += "s";
        }
        hV = "";
      }

      return hV + mV + sV;
  },
    
  renderDateTime: function(d) {
    var monthShortNames = {0:"Jan",1:"Feb",2:"Mar",3:"Apr",4:"May",5:"Jun",6:"Jul",7:"Aug",8:"Sep",9:"Oct",10:"Nov",11:"Dec"};
    var longForm = "";
    var shortForm = "";
      
    var suffix = "AM";
    var hours = d.getHours()
    var minutes = d.getMinutes()  
    if (hours >= 12) { suffix = "PM"; hours = hours - 12; }
    if (hours == 0) { hours = 12; }
    if (minutes < 10) { minutes = "0" + minutes; }
    var month = monthShortNames[d.getMonth()];
    var year = d.getYear()-100;
    if (year < 10 && year >= 0) { year = "0" + year; }
    if (year < 0) { year = 2000 + year; }
    longForm += hours + ":" + minutes + " " + suffix + " - ";
    longForm += d.getDate() + " " + month + " " + year;

    var nowDate = new Date();
    var timeDelta = nowDate - d;
    if (timeDelta < 1000) {
      shortForm = timeDelta + "ms ago";
    } else {
      timeDelta = Math.floor(timeDelta / 1000);
      if (timeDelta < 60) {
        shortForm = timeDelta + "s ago";
      } else {
        timeDelta = Math.floor(timeDelta / 60);
        if (timeDelta < 60) {
          shortForm = timeDelta + "m ago";
        } else {
          timeDelta = Math.floor(timeDelta / 60);
          if (timeDelta < 24) {
            shortForm = timeDelta + "h ago";
          } else if (nowDate.getYear() == d.getYear()) {
            shortForm = d.getDate() + " " + month;  
          } else {
            shortForm = d.getDate() + " " + month + " " + year;
          }
        }
      }
    }    
    
    return "<span title=\""+longForm+"\">" + shortForm + "</a>";
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
  },
  
  // Expects an HSV value w/ H in degrees and s,v in [0,1]      
  convertRGB: function (h,s,v) {
    if (s == 0) return [Math.round(255*v),Math.round(255*v),Math.round(255*v)];
    if (s < 0) s = 0.0; if (s > 1) s = 1.0;
    if (v < 0) v = 0.0; if (v > 1) v = 1.0;        
    if (h < 0) h = 0.0; if (h > 360) h = 360.0;
    var dh = (h/60.0)-Math.floor(h/60.0);      
    var z1 = v*(1-s);
    var z2 = v*(1-s*dh);
    var z3 = v*(1-s*(1-dh));
    var r=0;
    var g=0;
    var b=0;
    switch(Math.floor(h/60.0)) {
      case 0: r=v;g=z3;b=z1; break;
      case 1: r=z2;g=v;b=z1; break;
      case 2: r=z1;g=v;b=z3; break;
      case 3: r=z1;g=z2;b=v; break;
      case 4: r=z3;g=z1;b=v; break;
      case 5: r=v;g=z1;b=z2; break;
      default: r=0;g=0;b=0; break;
    }
    return [Math.round(255*r),Math.round(255*g),Math.round(255*b)];
  },

  // Round a float
  cleanFloat: function (x) {
	return Math.round(x*100)/100;
  },
  
  // Trim a string to a specific length
  trimTo: function (data,to) {
	  if (data.length > to) {
		  return data.substring(0,to-3)+"...";
	  } else {
		  return data;
	  }
  },
  
  // Convert a word to title case
  toTitle: function (word) {
	  return word[0].toUpperCase()+word.substring(1);
  },
    
  // Lower is red, higher is green.  
  generateAgonView : function (scaledRank, realRank, theText) {
    var theHTML = "<span style='background-color: " + UserInterface.generateAgonViewColor(scaledRank) + ";'>";
    theHTML += theText + UserInterface.cleanFloat(realRank);
    theHTML += "</span>";
    return theHTML;
  },
  
  generateAgonViewColor : function (scaledRank) {
    if (Math.abs(scaledRank) > 1.5) return "rgb(0,0,0)";
    var rgb = UserInterface.convertRGB(scaledRank*120,1.0,1.0)
    return "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")";
  }
}