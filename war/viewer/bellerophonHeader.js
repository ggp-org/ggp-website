function toTitle(x) {
  return x[0].toUpperCase()+x.substring(1);
}

var loginNascarHTML;
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
    theHTML += '    <td width=10% align="center" valign="bottom"><a class=biglink href="/view/' + theHost + '/stats/">Stats</a></td>';
    theHTML += '    <td width=30% align="right" valign="bottom"><a class=darklink href="/view/apollo/matches/">[Apollo]</a> <a class=darklink href="/view/dresden/matches/">[Dresden]</a> <a class=darklink href="/view/all/matches/">[All]</a></td>';
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

function renderMatchEntries(theMatchEntries, theOngoingMatches, topCaption, playerToHighlight) {
    loadBellerophonMetadataForGames();
    
    var theHTML = '<center><table class="matchlist">';
    theHTML += '<tr bgcolor=#E0E0E0><th height=30px colspan=10>' + topCaption + '</th></tr>';
    for (var i = 0; i < theMatchEntries.length; i++) {
      theHTML += renderMatchEntry(theMatchEntries[i], theOngoingMatches, playerToHighlight, i%2);
    }
    theHTML += "</table></center>";
    return theHTML;
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

  // TODO(schreib): Factor this out into a general function.
  renderDuration = function(x) {
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
  }
  
  // TODO(schreib): Find the right place for this.
  updateLiveDuration = function (objName, startTime) {
    var theSpan = document.getElementById(objName);
    if (theSpan == null) return;
    theSpan.innerHTML = renderDuration(new Date() - new Date(startTime));
    setTimeout("updateLiveDuration('" + objName + "'," + startTime + ")", 1000);
  }

  var theMatchHTML = "<tr>";
  if (showShadow == 1) {
    theMatchHTML = "<tr bgcolor=#E0E0E0>";
  } else {
    theMatchHTML = "<tr bgcolor=#F5F5F5>";
  }
  
  // Match start time.
  var theDate = new Date(theMatchJSON.startTime);
  theMatchHTML += '<td class="padded">' + UserInterface.renderDateTime(theDate);
  if (theOngoingMatches.indexOf(theMatchJSON.matchURL) >= 0) {
      theMatchHTML += '<br><center><b>(Ongoing! <span id="dlx_' + theMatchJSON.randomToken + '">' + renderDuration(new Date() - new Date(theMatchJSON.startTime)) + '</span>)</b></center>';
      setTimeout("updateLiveDuration('dlx_" + theMatchJSON.randomToken + "'," + theMatchJSON.startTime + ")", 1000);
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
    if ("playerNamesFromHost" in theMatchJSON) {
      theMatchHTML += '<td class="imageHolder" style="width:25px; padding-right:5px"><img width=25 height=25 src="http://placekitten.com/g/25/25"/></td>';
      theMatchHTML += '<td><a href="/view/' + window.location.pathname.split("/")[2] + '/players/' + theMatchJSON.playerNamesFromHost[j] + '">' + theMatchJSON.playerNamesFromHost[j] + '</a></td>';
    } else {
      theMatchHTML += '<td class="imageHolder" style="width:25px; padding-right:5px"><img width=25 height=25 src="//www.ggp.org/viewer/images/hosts/Unsigned.png" title="This player is not identified." /></td>';
      theMatchHTML += '<td>Anonymous</td>';
    }
    theMatchHTML += '<td width=5></td>';
    theMatchHTML += '<td class="imageHolder">'
    if (allErrorsForPlayer[j]) {
      theMatchHTML += '<img width=20 height=20 src="/viewer/images/warnings/YellowAlert.png" title="This player had all errors in this match.">';
    } else if (hasErrorsForPlayer[j]) {
      theMatchHTML += '<img width=20 height=20 src="/viewer/images/warnings/WhiteAlert.png" title="This player had errors in this match.">';
    }
    theMatchHTML += '</td>'
    theMatchHTML += '<td width=5></td>';
    if ("goalValues" in theMatchJSON) {
      theMatchHTML += '<td class="padded" style="text-align: right;">' + theMatchJSON.goalValues[j] + '</td>';
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
    if (theHostName == "apollo") theHostImage = "/viewer/images/hosts/Apollo2.png";
    if (theHostName == "dresden") theHostImage = "/viewer/images/hosts/Dresden2.png";
    if (theHostName == "artemis") theHostImage = "/viewer/images/hosts/Party.png";
    toTitle = function(x) { return x[0].toUpperCase()+x.substring(1); }
    theMatchHTML += '<td class="imageHolder"><a href="/view/' + theHostName + '/matches/"><img width=25 height=25 src="' + theHostImage + '" title="Match has a valid digital signature from ' + toTitle(theHostName) + '."></img></a></td>';
  } else {
    theMatchHTML += '<td class="imageHolder"><img width=25 height=25 src="/viewer/images/hosts/Unsigned.png" title="Match does not have a valid digital signature."></img></td>';
  }
  theMatchHTML += '<td width=5></td>';
  
  // Warning badge.
  if (allErrors) {
    theMatchHTML += '<td class="imageHolder"><img src="/viewer/images/warnings/OrangeAlert.png" title="Every player had all errors during this match." height=20px></img></td>';
  } else if (allErrorsForSomePlayer) {
    theMatchHTML += '<td class="imageHolder"><img src="/viewer/images/warnings/YellowAlert.png" title="At least one player had all errors during this match." height=20px></img></td>';
  } else if (hasErrors) {
    theMatchHTML += '<td class="imageHolder"><img src="/viewer/images/warnings/WhiteAlert.png" title="Players had errors during this match." height=20px></img></td>';
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

// Expects an HSV value w/ H in degrees and s,v in [0,1]      
function convertRGB (h,s,v) {
  if (s == 0) return [Math.round(255*v),Math.round(255*v),Math.round(255*v)];
  if (s < 0) s = 0.0; if (s > 1) s = 1.0;
  if (v < 0) v = 0.0; if (v > 1) v = 1.0;        
  if (h < 0) h = 0.0; if (h > 360) h = 360.0;
  var dh = (h/60.0)-Math.floor(h/60.0);      
  var z1 = v*(1-s);
  var z2 = v*(1-s*dh);
  var z3 = v*(1-s*(1-dh));        
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
}

var cleanFloat = function (x) { return Math.round(x*100)/100; };
var generateAgonView = function (scaledRank, realRank, theText) {
  var rgb = convertRGB(scaledRank*120,1.0,1.0)
  var theHTML = "<span style='background-color: rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ");'>";
  theHTML += theText + cleanFloat(realRank);
  theHTML += "</span>";
  return theHTML;
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
  if (getHostHashedPK() == "f69721b2f73839e513eed991e96824f1af218ac1" || getHostHashedPK() == "0ca7065b86d7646166d86233f9e23ac47d8320d4" || getHostHashedPK() == "all") {
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

    gameInfo.bellerophonLink = '/view/' + window.location.pathname.split("/")[2] + '/games/' + translateRepositoryIntoCodename(gameVersionedURL);
    gameInfo.bellerophonVersionFromURL = versionFromURL;

    if (!("gameName" in gameInfo)) {
      gameInfo.bellerophonName = toTitle(translateRepositoryIntoCodename(gameVersionedURL).split("/").splice(1)[0]);
    } else {
      gameInfo.bellerophonName = gameInfo.gameName;
    }
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
  if (hostName == "apollo") return "90bd08a7df7b8113a45f1e537c1853c3974006b2";
  if (hostName == "dresden") return "f69721b2f73839e513eed991e96824f1af218ac1";
  if (hostName == "artemis") return "5bc94f8e793772e8585a444f2fc95d2ac087fed0";
  if (hostName == "sample") return "0ca7065b86d7646166d86233f9e23ac47d8320d4";
  return hostName;
}

function getHostFromHashedPK(hostPK) {
    if (hostPK == "90bd08a7df7b8113a45f1e537c1853c3974006b2") return "apollo";
    if (hostPK == "f69721b2f73839e513eed991e96824f1af218ac1") return "dresden";
    if (hostPK == "5bc94f8e793772e8585a444f2fc95d2ac087fed0") return "artemis";
    if (hostPK == "0ca7065b86d7646166d86233f9e23ac47d8320d4") return "sample";
    return hostPK;
}