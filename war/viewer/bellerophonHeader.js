function toTitle(x) {
  return x[0].toUpperCase()+x.substring(1);
}

function getGameNameForDisplay(gameMetadata, gameMetadataURL) {
    if ("gameName" in gameMetadata) {
        return gameMetadata.gameName;
    } else {
        return toTitle(translateRepositoryIntoCodename(gameMetadataURL).split("/").splice(1)[0]);
    }
}

function generateHeader(theDiv) {    
    var theHost = window.location.pathname.split("/")[2];
    if (!theHost) theHost = "all";    
    
    var theHTML = "";
    theHTML += '<center>';
    theHTML += '<table style="width: 100%; border: 0; margin: 0; border-spacing: 0px 0px; bgcolor: rgb(160,160,160);">';
    theHTML += '  <tr class="navbarTop">';
    theHTML += '    <td width=2% align="left"></td>';
    theHTML += '    <td width=18% align="left" valign="bottom"><a class=logo href="/">GGP.org</a><span class=logo2>view</span></td>';
    theHTML += '    <td width=10% align="center" valign="bottom"><a class=biglink href="/view/' + theHost + '/">' + toTitle(theHost) + '</a></td>';
    theHTML += '    <td width=10% align="center" valign="bottom"><a class=biglink href="/view/' + theHost + '/games/">Games</a></td>';
    theHTML += '    <td width=10% align="center" valign="bottom"><a class=biglink href="/view/' + theHost + '/players/">Players</a></td>';
    theHTML += '    <td width=10% align="center" valign="bottom"><a class=biglink href="/view/' + theHost + '/matches/">Matches</a></td>';
    theHTML += '    <td width=40% align="right" valign="bottom"></td>';
    theHTML += '  </tr>';
    theHTML += '  <tr id="navBuffer" class="navbarBottom">'; 
    theHTML += '    <td colspan=10 height=10px></td>';
    theHTML += '  </tr>';
    theHTML += '</table>';
    theHTML += '</center>';
    theDiv.innerHTML = theHTML;    
}

function renderJSON(x) {
  var s = "";
  if (typeof(x) == "object" && !x[0]) {
    var hasEntries = false;
    s += "<table border=\"1px\">";
    for (y in x) {
      s += "<tr><td><b>" + y + "</b></td><td>" + renderJSON(x[y]) + "</td></tr>";
      hasEntries = true;
    }
    s += "</table>";
    if (!hasEntries) {
      return "";
    }
  } else {
    s += x;
  }
  return s;
}

var cachedPlayerData = null;
function getPerPlayerData() {
	if (cachedPlayerData == null) {
		cachedPlayerData = {};
		var theHost = window.location.pathname.split("/")[2];
		if (theHost == "tiltyard" || theHost == "all") {
			cachedPlayerData = ResourceLoader.load_json('//tiltyard.ggp.org/data/players/');
		}		
	}
	return cachedPlayerData;
}
function getPerPlayerImageURL(playerName, fullSize) {
	var perPlayerData = getPerPlayerData();
	if (playerName in perPlayerData && "imageURL" in perPlayerData[playerName]) {
		if (fullSize) {
			return perPlayerData[playerName].imageURL;
		} else {
			return perPlayerData[playerName].thumbURL;
		}
	} else {
		if (fullSize) {
			return 'http://placekitten.com/150/150';
		} else {
			return 'http://placekitten.com/25/25';
		}
	}
}

rMEB_extraMatchesForQuery = [];
rMEB_lastCursorForQuery = [];
function renderMatchEntryBox(renderIntoDiv, matchQuery, ongoingQuery, topCaption, emptyCaption, playerToHighlight) {
    loadBellerophonMetadataForGames();
    
    var theOngoingMatches = ResourceLoader.load_json('//database.ggp.org/query/' + ongoingQuery).queryMatches;
    var theMatchEntriesResponse = ResourceLoader.load_json('//database.ggp.org/query/' + matchQuery);
    var theMatchEntries = theMatchEntriesResponse.queryMatches;
    if (matchQuery in rMEB_extraMatchesForQuery) {
    	theMatchEntries = theMatchEntries.concat(rMEB_extraMatchesForQuery[matchQuery]);
    } else {
    	rMEB_lastCursorForQuery[matchQuery] = theMatchEntriesResponse.queryCursor;
    	rMEB_extraMatchesForQuery[matchQuery] = [];
    }
    
    function renderMatchesIntoDiv() {
	    var theHTML = '<center><table class="matchlist">';
	    theHTML += '<tr bgcolor=#E0E0E0><th height=30px colspan=10>' + topCaption + '</th></tr>';
	    if (theMatchEntries == null || theMatchEntries.length == 0) {
	    	theHTML += "<td>" + emptyCaption + "</td>";
	    } else {
	    	for (var i = 0; i < theMatchEntries.length; i++) {
	    		theHTML += renderMatchEntry(theMatchEntries[i], theOngoingMatches, playerToHighlight, i%2);
	    	}
	    }
	    theHTML += "</table></center>";
	    renderIntoDiv.innerHTML = theHTML;
    }
    
    var renderMore = function () {
    	var nextMatchEntriesResponse = ResourceLoader.load_json('//database.ggp.org/query/' + matchQuery + "," + rMEB_lastCursorForQuery[matchQuery]);
    	theMatchEntries = theMatchEntries.concat(nextMatchEntriesResponse.queryMatches);
    	rMEB_extraMatchesForQuery[matchQuery] = rMEB_extraMatchesForQuery[matchQuery].concat(nextMatchEntriesResponse.queryMatches);
    	rMEB_lastCursorForQuery[matchQuery] = nextMatchEntriesResponse.queryCursor;    	
    	renderMatchesIntoDiv();
    }

    renderMatchesIntoDiv();
    
    $(window).scroll(function(){  
        if ($(window).scrollTop() == $(document).height() - $(window).height()) {
          renderMore();
        }
    });
}

function trimTo(x,y) {
  if (x.length > y) {
    return x.substring(0,y-3)+"...";
  } else {
    return x;
  }
}

function renderMatchEntry(theMatchJSON, theOngoingMatches, playerToHighlight, showShadow) {
  getGameName = function (x) { return getGameInfo(x).bellerophonName; };
    
  if ("errors" in theMatchJSON) {
      var noErrorCandidates = true;
      var hasErrors = false;
      var allErrors = true;
      var hasErrorsForPlayer = [];
      var allErrorsForPlayer = [];
      var allErrorsForSomePlayer = false;
      for (var i = 0; i < theMatchJSON.gameRoleNames.length; i++) {
        hasErrorsForPlayer.push(false);
        allErrorsForPlayer.push(true);
      }
      if ("errors" in theMatchJSON) {
        for (var i = 0; i < theMatchJSON.errors.length; i++) {
          for (var j = 0; j < theMatchJSON.errors[i].length; j++) {
            if (theMatchJSON.errors[i][j] != "") {
              hasErrors = true;
              hasErrorsForPlayer[j] = true;
            } else {
              allErrorsForPlayer[j] = false;
              allErrors = false;
            }
            noErrorCandidates = false;
          }
        }
      }
      if (noErrorCandidates) {
        // If there are no moves so far, technically "all moves have been errors",
        // but that's a confusing way to present things, so it's better to show the
        // equally-true information "all moves have been error-free".
        allErrors = false;
        for (var i = 0; i < allErrorsForPlayer.length; i++) {
          allErrorsForPlayer[i] = false;
        }
      }
      for (var i = 0; i < allErrorsForPlayer.length; i++) {
        if (allErrorsForPlayer[i]) {
          allErrorsForSomePlayer = true;
        }
      }
  } else {
    var hasErrors = theMatchJSON.hasErrors;
    var allErrors = theMatchJSON.allErrors;
    var hasErrorsForPlayer = theMatchJSON.hasErrorsForPlayer;
    var allErrorsForPlayer = theMatchJSON.allErrorsForPlayer;
    var allErrorsForSomePlayer = theMatchJSON.allErrorsForSomePlayer;
  }
  
  // TODO(schreib): Find the right place for this.
  /*
  updateLiveDuration = function (objName, startTime) {
    var theSpan = document.getElementById(objName);
    if (theSpan == null) return;
    theSpan.innerHTML = UserInterface.renderDuration(new Date() - new Date(startTime));
    setTimeout("updateLiveDuration('" + objName + "'," + startTime + ")", 1000);
  }
  */

  var theMatchHTML = "<tr>";
  if (showShadow == 1) {
    theMatchHTML = "<tr bgcolor=#E0E0E0>";
  } else {
    theMatchHTML = "<tr bgcolor=#F5F5F5>";
  }
  
  // Match start time.
  var theDate = new Date(theMatchJSON.startTime);
  theMatchHTML += '<td class="padded">';  
  if (theOngoingMatches.indexOf(theMatchJSON.matchURL) >= 0) {
    //theMatchHTML += '<br><center><b>(Ongoing! <span id="dlx_' + theMatchJSON.randomToken + '">' + UserInterface.renderDuration(new Date() - new Date(theMatchJSON.startTime)) + '</span>)</b></center>';
    //setTimeout("updateLiveDuration('dlx_" + theMatchJSON.randomToken + "'," + theMatchJSON.startTime + ")", 1000);
    theMatchHTML += "<b>" + UserInterface.renderDateTime(theDate) + "</b>";
  } else {
    theMatchHTML += UserInterface.renderDateTime(theDate);
  }
  theMatchHTML += "</td>"  
  
  // Match players...
  theMatchHTML += '<td class="padded"><table class="matchlist" width=100%>';
  if ("matchRoles" in theMatchJSON) {
    var nPlayers = theMatchJSON.matchRoles;
  } else if ("playerNamesFromHost" in theMatchJSON) {
    var nPlayers = theMatchJSON.playerNamesFromHost.length;
  } else {
    var nPlayers = -1;
  }
  for (var j = 0; j < nPlayers; j++) {
    if ("playerNamesFromHost" in theMatchJSON && playerToHighlight == theMatchJSON.playerNamesFromHost[j]) {
        theMatchHTML += '<tr style="background-color: #CCEECC;">'
    } else {
        theMatchHTML += '<tr>'
    }
    if ("playerNamesFromHost" in theMatchJSON && theMatchJSON.playerNamesFromHost[j].length > 0) {
      var playerName = theMatchJSON.playerNamesFromHost[j];
      theMatchHTML += '<td class="imageHolder" style="width:25px; padding-right:5px"><img width=25 height=25 src="' + getPerPlayerImageURL(playerName, false) + '"/></td>';
      theMatchHTML += '<td><a href="/view/' + window.location.pathname.split("/")[2] + '/players/' + playerName + '">' + trimTo(playerName,15) + '</a></td>';
    } else {
      theMatchHTML += '<td class="imageHolder" style="width:25px; padding-right:5px"><img width=25 height=25 src="//www.ggp.org/viewer/images/hosts/Unsigned.png" title="This player is not identified." /></td>';
      theMatchHTML += '<td>Anonymous</td>';
    }
    theMatchHTML += '<td width=5></td>';
    theMatchHTML += '<td class="imageHolder">'
    if (allErrorsForPlayer[j]) {
      theMatchHTML += '<img src="/viewer/images/warnings/YellowAlert.png" title="This player had all errors in this match.">';
    } else if (hasErrorsForPlayer[j]) {
      theMatchHTML += '<img src="/viewer/images/warnings/WhiteAlert.png" title="This player had errors in this match.">';
    }
    theMatchHTML += '</td>'
    theMatchHTML += '<td width=5></td>';
    if ("goalValues" in theMatchJSON) {
      theMatchHTML += '<td class="padded" style="text-align: right;">' + theMatchJSON.goalValues[j] + '</td>';
    } else if ("isAborted" in theMatchJSON && theMatchJSON.isAborted) {
      theMatchHTML += '<td class="padded""><img src="/viewer/images/warnings/Abort.png" title="This match was aborted midway through."></td>';
    } else {
      theMatchHTML += '<td class="padded"></td>';
    }
    theMatchHTML += '<td width=5></td></tr>';
  }
  theMatchHTML += '</table></td>';

  // Match game profile.
  theMatchHTML += '<td class="padded"><a href="/view/' + window.location.pathname.split("/")[2] + '/games/' + translateRepositoryIntoCodename(theMatchJSON.gameMetaURL) + '">' + trimTo(getGameName(theMatchJSON.gameMetaURL),20) + '</a></td>';
  theMatchHTML += '<td width=5></td>';
  
  // Signature badge.
  if ("hashedMatchHostPK" in theMatchJSON) {
    var theHostName = getHostFromHashedPK(theMatchJSON.hashedMatchHostPK);    
    var theHostImage = "/viewer/images/hosts/Unknown.png";
    if (theHostName == "tiltyard") theHostImage = "/viewer/images/hosts/Tiltyard2.png";
    if (theHostName == "dresden") theHostImage = "/viewer/images/hosts/Dresden3.png";
    if (theHostName == "artemis") theHostImage = "/viewer/images/hosts/Party.png";
    toTitle = function(x) { return x[0].toUpperCase()+x.substring(1); }
    theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/"><img width=25 height=25 src="' + theHostImage + '" title="Match has a valid digital signature from ' + toTitle(theHostName) + '."></img></a></td>';
  } else {
    theMatchHTML += '<td class="imageHolder"><a href="/view/unsigned/matches/"><img width=25 height=25 src="/viewer/images/hosts/Unsigned.png" title="Match does not have a valid digital signature."></img></a></td>';
  }
  theMatchHTML += '<td width=5></td>';
  
  // Warning badge.
  if (allErrors) {
    theMatchHTML += '<td class="imageHolder"><img src="/viewer/images/warnings/OrangeAlert.png" title="Every player had all errors during this match."></img></td>';
  } else if (allErrorsForSomePlayer) {
    theMatchHTML += '<td class="imageHolder"><img src="/viewer/images/warnings/YellowAlert.png" title="At least one player had all errors during this match."></img></td>';
  } else if (hasErrors) {
    theMatchHTML += '<td class="imageHolder"><img src="/viewer/images/warnings/WhiteAlert.png" title="Players had errors during this match."></img></td>';
  } else {
    theMatchHTML += '<td></td>';
  }
  theMatchHTML += '<td width=5></td>';
  
  // Match page URL.
  var matchURL = theMatchJSON.matchURL.replace("http://matches.ggp.org/matches/", "");
  theMatchHTML += '<td class="padded"><a href="/view/' + window.location.pathname.split("/")[2] + '/matches/' + matchURL + '">View</a></td>';
  theMatchHTML += '<td width=5></td>';
  return theMatchHTML + "</tr>";
}

global_gameMetadata = {};
function loadBellerophonMetadataForGames() {
  function loadRepositoryIntoMetadata(repoURL) {
    var theMetadata = ResourceLoader.load_json(repoURL + "metadata");
    for (var gameKey in theMetadata) {
      global_gameMetadata[repoURL + gameKey + "/"] = theMetadata[gameKey];
    }
  }
    
  // TODO: Make this more elegant.
  if (getHostHashedPK() == "f69721b2f73839e513eed991e96824f1af218ac1" || getHostHashedPK() == "0ca7065b86d7646166d86233f9e23ac47d8320d4" || getHostHashedPK() == "all" || getHostHashedPK() == "unsigned") {
    loadRepositoryIntoMetadata("//games.ggp.org/dresden/games/");
  }
  if (getHostHashedPK() != "f69721b2f73839e513eed991e96824f1af218ac1") {
    loadRepositoryIntoMetadata("//games.ggp.org/base/games/");
  }
  
  getGameInfo = function (gameVersionedURL) {
    var splitURL = gameVersionedURL.split("/");
    var versionFromURL = 1*(splitURL[splitURL.length-2].replace("v",""));
    if (isNaN(versionFromURL)) {
      versionFromURL = null;
      // NOTE: Explore how often this happens?
      //alert('getGameInfo got a non-versioned URL!');
    } else {
      splitURL = splitURL.splice(0,splitURL.length-2);
      splitURL.push('');
    }
    var gameUnversionedURL = splitURL.join("/").replace("http:", "");
    // TODO: Ultimately we should look up version-specific metadata?
    var gameInfo = global_gameMetadata[gameUnversionedURL];
    
    if (gameInfo == null) {
      console.log("Could not find game: " + gameUnversionedURL);
      gameInfo = {};
    }

    gameInfo.bellerophonLink = '/view/' + window.location.pathname.split("/")[2] + '/games/' + translateRepositoryIntoCodename(gameVersionedURL);
    gameInfo.bellerophonVersionFromURL = versionFromURL;
    gameInfo.bellerophonName = getGameNameForDisplay(gameInfo, gameVersionedURL);
    return gameInfo;
  }
}

function translateRepositoryCodename(x) {
  return x.replace("base/", "http://games.ggp.org/base/games/").replace("dresden/", "http://games.ggp.org/dresden/games/");
}
function translateRepositoryIntoCodename(x) {
    return x.replace("http://games.ggp.org/base/games/", "base/").replace("http://games.ggp.org/dresden/games/", "dresden/");
}

function getHostHashedPK() {
  var hostName = window.location.pathname.split("/")[2];
  if (hostName == "tiltyard") return "90bd08a7df7b8113a45f1e537c1853c3974006b2";
  if (hostName == "dresden") return "f69721b2f73839e513eed991e96824f1af218ac1";
  if (hostName == "artemis") return "5bc94f8e793772e8585a444f2fc95d2ac087fed0";
  if (hostName == "sample") return "0ca7065b86d7646166d86233f9e23ac47d8320d4";
  return hostName;
}

function getHostFromHashedPK(hostPK) {
    if (hostPK == "90bd08a7df7b8113a45f1e537c1853c3974006b2") return "tiltyard";
    if (hostPK == "f69721b2f73839e513eed991e96824f1af218ac1") return "dresden";
    if (hostPK == "5bc94f8e793772e8585a444f2fc95d2ac087fed0") return "artemis";
    if (hostPK == "0ca7065b86d7646166d86233f9e23ac47d8320d4") return "sample";
    return hostPK;
}