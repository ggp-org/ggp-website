function getGameNameForDisplay(gameMetadata, gameMetadataURL) {
    if ("gameName" in gameMetadata) {
        return gameMetadata.gameName;
    } else {
        return UserInterface.toTitle(translateRepositoryIntoCodename(gameMetadataURL).split("/").splice(1)[0]);
    }
}

function getHostFromView() {
	// Only allow a specific set of hosts, to avoid confusion if URLs are messed with.
	var legitHosts = ["all", "artemis", "dresden", "sample", "tiltyard", "unsigned", "cs227b", "cs227b_0"];
    var theHost = window.location.pathname.split("/")[2];    
    if (!theHost) theHost = "all";
    if (legitHosts.indexOf(theHost) == -1) theHost = "all";
    return theHost;
}

function getTournamentFromView() {
	if (window.location.hash) {
		return window.location.hash.substr(1);
	}
}

function generateHeaderForViewer(theDiv) {
	var theHost = getHostFromView();
	var thePageTitle = '<a href="/view/' + theHost + '/">' + UserInterface.toTitle(theHost) + '</a>';
	var thePageType = null;
	if (window.location.pathname.split("/").length > 3) {
		// Only allow a specific set of page types, again to avoid confusion.
		var legitTypes = ["logs", "matches", "games", "players"];
		thePageType = window.location.pathname.split("/")[3];
		if (thePageType && legitTypes.indexOf(thePageType) >= 0) {
			thePageTitle += " " + UserInterface.toTitle(thePageType);
		}
	}

	var thePageTabs = "";
	var tabs = ["games", "players", "matches"];
	for (var i = 0; i < tabs.length; i++) {
		thePageTabs += '<td><a href="/view/' + theHost + '/' + tabs[i] + '/">' + tabs[i] + ' list</td>';
		if (i+1 < tabs.length) {
			thePageTabs += '<td width=' + Math.floor(50/tabs.length) + '%></td>';
		}
	}

	generateHeader(theDiv, thePageTitle, thePageTabs);
}

function generateHeader(theDiv, pageTitle, pageTabs) {
    var theHTML = "";
    theHTML += '<div>';
    theHTML += '<h1><a href="//www.ggp.org/"><img src="//www.ggp.org/viewer/images/other/HeaderLogo.png" /> GGP.org</a></h1>';
    theHTML += '<h2>' + pageTitle + '</h2>';
	theHTML += '<table align="center" height=36><tr>';
	theHTML += pageTabs;
	theHTML += '</tr></table>';
	theHTML += '</div>';
    theDiv.innerHTML = theHTML;    
}

var cachedPlayerData = {};
function getPlayerData(playerName) {
	var theHost = getHostFromView();
	if (theHost == "tiltyard" || theHost == "all") {
		if (!(playerName in cachedPlayerData)) {
			cachedPlayerData[playerName] = ResourceLoader.load_json('//tiltyard.ggp.org/data/players/' + playerName);
		}
		return cachedPlayerData[playerName];
	} else {
		return null;
	}	
}
function getPlayerImageURL(playerName, fullSize) {
	var playerData = getPlayerData(playerName);
	if (playerData && "imageURL" in playerData) {
		if (fullSize) {
			return playerData.imageURL;
		} else {
			return playerData.thumbURL;
		}
	} else {
		if (fullSize) {
			return 'http://placekitten.com/g/150/150';
		} else {
			return 'http://placekitten.com/g/25/25';
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
	    theHTML += '<tr class="zebra"><th height=30px colspan=12>' + topCaption + '</th></tr>';
	    if (theMatchEntries == null || theMatchEntries.length == 0) {
	    	theHTML += "<td>" + emptyCaption + "</td>";
	    } else {
	    	for (var i = 0; i < theMatchEntries.length; i++) {
	    		theHTML += renderMatchEntry(theMatchEntries[i], theOngoingMatches, playerToHighlight);
	    	}
	    }
	    theHTML += "</table></center>";
	    renderIntoDiv.innerHTML = theHTML;
    }
    
    var renderMore = function () {
    	if (rMEB_lastCursorForQuery[matchQuery]) {
    	  var nextMatchEntriesResponse = ResourceLoader.load_json('//database.ggp.org/query/' + matchQuery + "," + rMEB_lastCursorForQuery[matchQuery]);
    	  theMatchEntries = theMatchEntries.concat(nextMatchEntriesResponse.queryMatches);
    	  rMEB_extraMatchesForQuery[matchQuery] = rMEB_extraMatchesForQuery[matchQuery].concat(nextMatchEntriesResponse.queryMatches);
    	  rMEB_lastCursorForQuery[matchQuery] = nextMatchEntriesResponse.queryCursor;    	
    	  renderMatchesIntoDiv();
    	}
    }

    renderMatchesIntoDiv();
    
    $(window).scroll(function(){  
        if ($(window).scrollTop() == $(document).height() - $(window).height()) {
          renderMore();
        }
    });
}

function renderMatchEntry(theMatchJSON, theOngoingMatches, playerToHighlight) {
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
  
  var theMatchHTML = '<tr class="zebra">';

  // Match start time.
  var theDate = new Date(theMatchJSON.startTime);
  theMatchHTML += '<td class="padded">';  
  if (theOngoingMatches.indexOf(theMatchJSON.matchURL) >= 0) {
    theMatchHTML += "<i>" + UserInterface.renderDateTime(theDate) + "</i>";
  } else {
    theMatchHTML += UserInterface.renderDateTime(theDate);
  }
  theMatchHTML += "</td>"  
  
  // Match players...  
  if ("matchRoles" in theMatchJSON) {
    var nPlayers = theMatchJSON.matchRoles;
  } else if ("playerNamesFromHost" in theMatchJSON) {
    var nPlayers = theMatchJSON.playerNamesFromHost.length;
  } else {
    var nPlayers = -1;
  }
  theMatchHTML += '<td class="padded"><table class="playerlist" width=100%>';
  for (var j = 0; j < nPlayers; j++) {	  
    if ("playerNamesFromHost" in theMatchJSON && playerToHighlight == theMatchJSON.playerNamesFromHost[j]) {
        theMatchHTML += '<tr class="highlighted">'
    } else {
        theMatchHTML += '<tr>'
    }
    if ("playerNamesFromHost" in theMatchJSON && theMatchJSON.playerNamesFromHost[j].length > 0) {
      var playerName = theMatchJSON.playerNamesFromHost[j];
      theMatchHTML += '<td class="imageHolder" style="width:25px; padding-right:5px"><img width=25 height=25 title="' + playerName + '" src="' + getPlayerImageURL(playerName, false) + '"/></td>';
      theMatchHTML += '<td><a href="/view/' + getHostFromView() + '/players/' + playerName + '" title="' + playerName + '">' + UserInterface.trimTo(playerName,15) + '</a></td>';
    } else {
      theMatchHTML += '<td class="imageHolder" style="width:25px; padding-right:5px"><img width=25 height=25 title="Anonymous" src="//www.ggp.org/viewer/images/hosts/Unsigned.png" title="This player is not identified." /></td>';
      theMatchHTML += '<td>Anonymous</td>';
    }
    theMatchHTML += '<td width=5></td>';
    theMatchHTML += '<td class="imageHolder">'
    if (allErrorsForPlayer[j]) {
      theMatchHTML += '<img src="//www.ggp.org/viewer/images/warnings/YellowAlert.png" title="This player had all errors in this match." style="width: 29px; height: 24px;">';
    } else if (hasErrorsForPlayer[j]) {
      theMatchHTML += '<img src="//www.ggp.org/viewer/images/warnings/WhiteAlert.png" title="This player had errors in this match." style="width: 29px; height: 24px;">';
    }
    theMatchHTML += '</td>'
    if ("goalValues" in theMatchJSON) {
      theMatchHTML += '<td class="padded" style="text-align: right;">' + theMatchJSON.goalValues[j] + '</td>';
    } else if ("isAborted" in theMatchJSON && theMatchJSON.isAborted) {
      theMatchHTML += '<td class="padded""><img src="//www.ggp.org/viewer/images/warnings/Abort.png" title="This match was aborted midway through." style="float:right; width: 20px; height: 20px;"></td>';
    } else {
      theMatchHTML += '<td class="padded"></td>';
    }
    theMatchHTML += '<td width=5></td></tr>';
  }
  theMatchHTML += '</table></td>';

  // Match game profile.
  theMatchHTML += '<td class="padded"><a href="/view/' + getHostFromView() + '/games/' + translateRepositoryIntoCodename(theMatchJSON.gameMetaURL) + '">' + UserInterface.trimTo(getGameName(theMatchJSON.gameMetaURL),20) + '</a></td>';
  theMatchHTML += '<td width=5></td>';
  
  // Tournament badge.
  if ("tournamentNameFromHost" in theMatchJSON) {
	  var theHostName = getHostFromHashedPK(theMatchJSON.hashedMatchHostPK);
	  if (theHostName == "tiltyard" && theMatchJSON.tournamentNameFromHost == "tiltyard_continuous") {
		  theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/matches/#' + theMatchJSON.tournamentNameFromHost + '"><core-icon icon="schedule" style="color:black;" title="Continuous play match"></core-icon></a></td>';
	  } else if (theHostName == "tiltyard" && theMatchJSON.tournamentNameFromHost == "tiltyard_requested") {
		  theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/matches/#' + theMatchJSON.tournamentNameFromHost + '"><core-icon icon="add-circle-outline" style="color:black;" title="Manually requested match"></core-icon></a></td>';
	  } else if (theHostName == "dresden" && theMatchJSON.tournamentNameFromHost == "manual_matches") {
		  theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/matches/#' + theMatchJSON.tournamentNameFromHost + '"><core-icon icon="add-circle-outline" style="color:black;" title="Manually requested match"></core-icon></a></td>';
	  } else {
		  theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/matches/#' + theMatchJSON.tournamentNameFromHost + '"><core-icon icon="group-work" style="color:black;" title="Tournament match"></core-icon></a></td>';
	  }
  } else {
	  theMatchHTML += '<td></td>';
  }
  theMatchHTML += '<td width=5></td>';
  
  // Signature badge.
  if ("hashedMatchHostPK" in theMatchJSON) {
    var theHostName = getHostFromHashedPK(theMatchJSON.hashedMatchHostPK);
    var theHostImage = "//www.ggp.org/viewer/images/hosts/Unknown.png";
    if (theHostName == "tiltyard") theHostImage = "//www.ggp.org/viewer/images/hosts/Tiltyard.png";
    if (theHostName == "dresden") theHostImage = "//www.ggp.org/viewer/images/hosts/Dresden.png";
    if (theHostName == "artemis") theHostImage = "//www.ggp.org/viewer/images/hosts/Party.png";
    if (theHostName == "cs227b") theHostImage = "//www.ggp.org/viewer/images/hosts/CS227b.png";
    if (theHostName == "cs227b_0") theHostImage = "//www.ggp.org/viewer/images/hosts/CS227b.png";
    // theHostImage = "//www.ggp.org/viewer/images/hosts/Lightbulb.png";
    theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/"><img width=25 height=25 src="' + theHostImage + '" title="Match has a valid digital signature from ' + UserInterface.toTitle(theHostName) + '."></img></a></td>';
  } else {
    theMatchHTML += '<td class="imageHolder"><a href="/view/unsigned/matches/"><img width=25 height=25 src="//www.ggp.org/viewer/images/hosts/Unsigned.png" title="Match does not have a valid digital signature."></img></a></td>';
  }
  theMatchHTML += '<td width=5></td>';
  
  // Match page URL.
  var matchURL = theMatchJSON.matchURL.replace("http://matches.ggp.org/matches/", "");
  theMatchHTML += '<td class="padded"><a href="/view/' + getHostFromView() + '/matches/' + matchURL + '"><img src="//www.ggp.org/viewer/images/other/RightArrow.png" title="View more details about this match."></img></a></td>';
  theMatchHTML += '<td width=5></td>';
  return theMatchHTML + "</tr>";
}

// This is a prototype that renders one match entry per line... still a work in progress.
function renderMatchEntryLinearly(theMatchJSON, theOngoingMatches, playerToHighlight) {
  getGameName = function (x) { return getGameInfo(x).bellerophonName; };	  
  var theMatchHTML = '<tr class="zebra">';

  // Match start time.
  var theDate = new Date(theMatchJSON.startTime);
  theMatchHTML += '<td class="padded">';  
  if (theOngoingMatches.indexOf(theMatchJSON.matchURL) >= 0) {
    theMatchHTML += "<i>" + UserInterface.renderDateTime(theDate) + "</i>";
  } else {
    theMatchHTML += UserInterface.renderDateTime(theDate);
  }
  theMatchHTML += "</td>"

  // Match game profile.
  theMatchHTML += '<td class="padded"><a href="/view/' + getHostFromView() + '/games/' + translateRepositoryIntoCodename(theMatchJSON.gameMetaURL) + '">' + UserInterface.trimTo(getGameName(theMatchJSON.gameMetaURL),20) + '</a></td>';
  theMatchHTML += '<td width=5></td>';
  
  // Signature badge.
  if ("hashedMatchHostPK" in theMatchJSON) {
    var theHostName = getHostFromHashedPK(theMatchJSON.hashedMatchHostPK);    
    var theHostImage = "//www.ggp.org/viewer/images/hosts/Unknown.png";
    if (theHostName == "tiltyard") theHostImage = "//www.ggp.org/viewer/images/hosts/Tiltyard.png";
    if (theHostName == "dresden") theHostImage = "//www.ggp.org/viewer/images/hosts/Dresden.png";
    if (theHostName == "artemis") theHostImage = "//www.ggp.org/viewer/images/hosts/Party.png";
    theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/"><img width=25 height=25 src="' + theHostImage + '" title="Match has a valid digital signature from ' + UserInterface.toTitle(theHostName) + '."></img></a></td>';
  } else {
    theMatchHTML += '<td class="imageHolder"><a href="/view/unsigned/matches/"><img width=25 height=25 src="//www.ggp.org/viewer/images/hosts/Unsigned.png" title="Match does not have a valid digital signature."></img></a></td>';
  }
  theMatchHTML += '<td width=5></td>';
  
  // Match page URL.
  var matchURL = theMatchJSON.matchURL.replace("http://matches.ggp.org/matches/", "");
  theMatchHTML += '<td class="padded"><a href="/view/' + getHostFromView() + '/matches/' + matchURL + '"><img src="//www.ggp.org/viewer/images/other/RightArrow.png" title="View more details about this match."></img></a></td>';
  theMatchHTML += '<td width=5></td>';
  
  // Match players...  
  if ("matchRoles" in theMatchJSON) {
    var nPlayers = theMatchJSON.matchRoles;
  } else if ("playerNamesFromHost" in theMatchJSON) {
    var nPlayers = theMatchJSON.playerNamesFromHost.length;
  } else {
    var nPlayers = -1;
  }
  theMatchHTML += '<td class="padded"><table><tr>';
  for (var j = 0; j < nPlayers; j++) {
	var fgColor = 'rgb(0,0,0)';
	var bgColor = 'rgb(0,0,0)';
    if ("goalValues" in theMatchJSON) {
    	var x = theMatchJSON.goalValues[j];
    	fgColor = 'rgb(' + 255*(x/100) + ',' + 255*(x/100) + ',' + 255*(1-(x/100)) + ')';
    } else if ("isAborted" in theMatchJSON && theMatchJSON.isAborted) {
    	fgColor = 'rgb(150,150,150)';
    } else {
    	;
    }
    bgColor = fgColor;
    if ("playerNamesFromHost" in theMatchJSON && playerToHighlight == theMatchJSON.playerNamesFromHost[j]) {
    	fgColor = 'rgb(0,255,0)';
    }
    theMatchHTML += '<td class="imageHolder" style="border: 2px dotted ' + fgColor + '; background-color: ' + bgColor + '; width:25px;">';
    if ("playerNamesFromHost" in theMatchJSON && theMatchJSON.playerNamesFromHost[j].length > 0) {
      var playerName = theMatchJSON.playerNamesFromHost[j];
      theMatchHTML += '<a href="/view/' + getHostFromView() + '/players/' + playerName + '"><img width=25 height=25 title="' + playerName + '" src="' + getPlayerImageURL(playerName, false) + '"/></a>';
    } else {
      theMatchHTML += '<img width=25 height=25 title="Anonymous" src="//www.ggp.org/viewer/images/hosts/Unsigned.png" title="This player is not identified." />';
    }
    theMatchHTML += '</td>';
  }	  
  theMatchHTML += '</tr></table>';	  
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
  if (getHostFromView() == "dresden" || getHostFromView() == "sample" || getHostFromView() == "cs227b" || getHostFromView() == "all" || getHostFromView() == "unsigned") {
    loadRepositoryIntoMetadata("//games.ggp.org/dresden/games/");
  }
  if (getHostFromView() == "cs227b" || getHostFromView() == "cs227b_0" || getHostFromView() == "all" || getHostHashedPK() == "unsigned") {
	loadRepositoryIntoMetadata("//games.ggp.org/stanford/games/");
  }
  if (getHostFromView() != "dresden" && getHostFromView() != "cs227b_0") {
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

    gameInfo.bellerophonLink = '/view/' + getHostFromView() + '/games/' + translateRepositoryIntoCodename(gameVersionedURL);
    gameInfo.bellerophonVersionFromURL = versionFromURL;
    gameInfo.bellerophonName = getGameNameForDisplay(gameInfo, gameVersionedURL);
    return gameInfo;
  }
}

function translateRepositoryCodename(x) {
  return x.replace("base/", "http://games.ggp.org/base/games/").replace("dresden/", "http://games.ggp.org/dresden/games/").replace("stanford/", "http://games.ggp.org/stanford/games/");
}
function translateRepositoryIntoCodename(x) {
    return x.replace("http://games.ggp.org/base/games/", "base/").replace("http://games.ggp.org/dresden/games/", "dresden/").replace("http://games.ggp.org/stanford/games/", "stanford/");
}

function getHostHashedPK() {
  var hostName = getHostFromView();
  if (hostName == "tiltyard") return "90bd08a7df7b8113a45f1e537c1853c3974006b2";
  if (hostName == "dresden") return "f69721b2f73839e513eed991e96824f1af218ac1";
  if (hostName == "artemis") return "5bc94f8e793772e8585a444f2fc95d2ac087fed0";
  if (hostName == "sample") return "0ca7065b86d7646166d86233f9e23ac47d8320d4";    
  if (hostName == "cs227b") return "52bd861857f677a2432837fcf2f7d73a4e6b30d7";
  if (hostName == "cs227b_0") return "61fd02210648144d820f57ff06689939159dd2e9";
  return hostName;
}

function getHostFromHashedPK(hostPK) {
    if (hostPK == "90bd08a7df7b8113a45f1e537c1853c3974006b2") return "tiltyard";
    if (hostPK == "f69721b2f73839e513eed991e96824f1af218ac1") return "dresden";
    if (hostPK == "5bc94f8e793772e8585a444f2fc95d2ac087fed0") return "artemis";
    if (hostPK == "0ca7065b86d7646166d86233f9e23ac47d8320d4") return "sample";
    if (hostPK == "52bd861857f677a2432837fcf2f7d73a4e6b30d7") return "cs227b";
    if (hostPK == "61fd02210648144d820f57ff06689939159dd2e9") return "cs227b_0";
    return hostPK;
}

function getTournamentName() {
	var tournamentID = getTournamentFromView();
	if (tournamentID == "tiltyard_continuous") return "Tiltyard Continuous Matches";
	if (tournamentID == "tiltyard_requested") return "Tiltyard Requested Matches";
	if (tournamentID == "tiltyard_open_20151204") return "2015-12-04 Tiltyard Open";
	return tournamentID;
}