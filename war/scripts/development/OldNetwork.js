//------------------------------------------------------------------------------
// gamemaster.js
//------------------------------------------------------------------------------

var styleurl = '';
var description = '';
var rulesheet = '';
var stylesheet = '';
var javascript = '';

var players=seq('random','random');
var addresses=seq('local','local');
var phase = false;
var trace = false;


function dosetup ()
 {matchid = document.getElementById('match').value;
  startclock = document.getElementById('startclock').value*1;
  playclock = document.getElementById('playclock').value*1;
  players = seq();
  addresses = seq();
  var roster = document.getElementById('roster');
  for (var i=1; i<roster.rows.length; i++)
      {players[i-1] = roster.rows[i].cells[1].childNodes[0].value;
       addresses[i-1] = roster.rows[i].cells[2].childNodes[0].value};

  phase = false;
  state = findinits(library);
  herstory = seq(nil,state);
  movelog = seq(nil);
  step = 1;
  showstate(state);
  showcontroller();
  showhistory();

  display('statearea');
  return true}

//------------------------------------------------------------------------------

function doping ()
 {for (var i=0; i<players.length; i++)
      {askping(players[i],addresses[i])}}

function askping (player,address)
 {postPing(address + '/' + player + '/ping?','');
  return true}

function postPing (url,args) {
  var request = false;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/xml');
    }
  } else if (window.ActiveXObject) {
    try {
      request = new ActiveXObject('Msxml2.XMLHTTP')
    } catch (e) {
      try {
        request = new ActiveXObject('Microsoft.XMLHTTP')
      } catch (e) {}
    }
  }
  
  request.onreadystatechange = function () {alertPing(request)};  
  request.open('GET', url, true);
  request.send('');
  return true;
}

function alertPing (request) {
  if (request.readyState == 4) {
    if (request.responseText) {
      alert(request.responseText)
    } else {
      alert('There was a problem with the request in alertResult.')
    }
  }
}

//------------------------------------------------------------------------------

function dostart () {
  phase = 'started';
  showstep(1);
  for (var i=0; i<roles.length; i++) {
    var desc = '(' + printem(library) + ')';
    askstart('m01', roles[i], desc, startclock, playclock, styleurl, players[i], addresses[i])
  };
  stepeval('doplay()',(startclock+1)*1000);
  return true;
}

function askstart (matchid,role,rules,sc,pc,style,player,address) {
  var request = address + '/director/' + player + '/start?';
  request = request + 'match=' + matchid;
  request = request + '&role=' + role;
  request = request + '&rulesheet=' + rules;
  request = request + '&startclock=' + sc;
  request = request + '&playclock=' + pc;
  request = request + '&stylesheet=' + encodeURIComponent(style);
  postStart(role,request,'');
  return true;
}

function postStart (role,url,args) {
  var request = false;
  if (window.XMLHttpRequest) {
    request = new XMLHttpRequest();
    if (request.overrideMimeType) {
      request.overrideMimeType('text/xml')
    }
  } else if (window.ActiveXObject) {
    try {
      request = new ActiveXObject('Msxml2.XMLHTTP')
    } catch (e) {
      try {
        request = new ActiveXObject('Microsoft.XMLHTTP')
      } catch (e) {}
    }
  }
  
  request.onreadystatechange = function () {alertStart(role,request)};
  request.open('GET', url, true);
  request.send(args);
  return true;
}

function alertStart (role,request) {
  if (request.readyState == 4) {
    if (request.responseText) {
      endstart(role,request.responseText);
    } else {
      alert('There was a problem with the request.');
    }
  }
}

function endstart (role,answer)
 {if (trace) {alert(role + ': ' + answer)};
  var controller = document.getElementById('controller');
  for (var i=0; i<roles.length; i++)
      {if (roles[i]==role)
          {controller.rows[2].cells[i].innerHTML = answer;
           break}};
  return true}

//------------------------------------------------------------------------------

function doplay ()
 {if (phase == 'started') {phase = 'running'; return dobegin()};
  dosimulate();
  return true}

function dobegin ()
 {for (var j=0; j<roles.length; j++)
      {controller.rows[2].cells[j].innerHTML = '&nbsp;'};
  for (var j=0; j<roles.length; j++)
      {askplay(matchid,roles[j],nil,players[j],addresses[j])};
  stepeval('doplay()',(playclock+1)*1000);
  return true}

function domore ()
 {var move = nil;
  if (movelog.length > 0) {move = movelog[movelog.length-1]};
  for (var i=0; i<players.length; i++)
      {askplay('m01',roles[i],move,players[i],addresses[i])}
  stepeval('doplay()',(playclock+1)*1000);
  return true}

function askplay (matchid,role,move,player,address)
 {var request = address + '/director/' + player + '/play?';
  request = request + 'match=' + matchid;
  request = request + '&move=' + printit(move);
  postPlay(role,request,'')
  return true}

function postPlay (role,url,args)
 {var request = false;
  if (window.XMLHttpRequest)
     {request = new XMLHttpRequest();
      if (request.overrideMimeType)
         {request.overrideMimeType('text/xml');}}
  else if (window.ActiveXObject)
          {try {request = new ActiveXObject('Msxml2.XMLHTTP')}
           catch (e) {try {request = new ActiveXObject('Microsoft.XMLHTTP')}
                      catch (e) {} }};
  request.onreadystatechange = function () {alertPlay(role,request)};
  request.open('GET', url, true);
  request.send(args);
  return true}

function alertPlay (role,request)
 {if (request.readyState == 4)
     {if (request.responseText)
         {endplay(role,request.responseText)}
      else {alert('There was a problem with the request in alertResult.')}}}

function endplay (role,answer)
 {answer = decodeURIComponent(answer);
  if (trace) {alert(role + ': ' + answer)};
  var controller = document.getElementById('controller');
  for (var i=0; i<roles.length; i++)
      {if (roles[i]==role)
          {controller.rows[2].cells[i].innerHTML = grind(readkif(answer));
           break}};
  return true}

//------------------------------------------------------------------------------

function dosimulate ()
 {var move = seq();
  var controller = document.getElementById('controller');
  var table = document.getElementById('history');
  var row = table.insertRow(step);
  var cell = row.insertCell(0);
  cell.innerHTML = step;
  cell.align = 'right';
  cell.setAttribute('bgcolor','#dddddd');
  cell.setAttribute('style','cursor:pointer');
  cell.setAttribute('onClick','showstep(this.innerHTML*1); display("statearea")');
  for (var i=0; i<roles.length; i++)
      {cell = row.insertCell(i+1)};
  for (var i=0; i<roles.length; i++)
      {var ply = read(controller.rows[2].cells[i].innerHTML);
       controller.rows[2].cells[i].innerHTML = '&nbsp;';
       if (!findlegalp(roles[i],ply,truify(state),library))
          {ply = findlegalx(roles[i],truify(state),library)}  
       row.cells[i+1].innerHTML = grind(ply);
       move[move.length] = ply};
  play(move);
  if (findterminal(truify(state),library))
     {phase = 'stopped';
      row = table.insertRow(step);
      row.setAttribute('bgcolor','#dddddd');
      var cell = row.insertCell(0);
      cell.innerHTML = step;
      cell.setAttribute('bgcolor','#ffffff');
      for (var i=0; i<roles.length; i++)
          {cell = row.insertCell(i+1);
           cell.setAttribute('align','center');
           var reward = findreward(roles[i],truify(state),library);
           cell.innerHTML = reward;
           controller.rows[2].cells[i].innerHTML = reward};
      dostop();
      return true};
  domore();
  showstep(step);
  return true}

//------------------------------------------------------------------------------

function doabort ()
 {phase = false;
  showcontrollermove(step);
  for (var i=0; i<players.length; i++)
      {askabort(matchid,players[i],addresses[i])}}

function askabort (matchid,player,address)
 {postAbort(address + '/director/' + player + '/abort?match=' + matchid,'');
  return true}

function postAbort (url,args)
 {var request = false;
  if (window.XMLHttpRequest)
     {request = new XMLHttpRequest();
      if (request.overrideMimeType)
         {request.overrideMimeType('text/xml');}}
  else if (window.ActiveXObject)
          {try {request = new ActiveXObject('Msxml2.XMLHTTP')}
           catch (e) {try {request = new ActiveXObject('Microsoft.XMLHTTP')}
                      catch (e) {} }};
  request.onreadystatechange = function () {alertAbort(request)};
  request.open('GET', url, true);
  request.send(args);
  return true}

function alertAbort (request)
 {if (request.readyState == 4)
     {if (request.responseText)
         {endabort(request.responseText)}
      else {alert('There was a problem with the request in alertResult.')}}}

function endabort (answer)
 {if (trace) {alert(answer)};
  return true}

//------------------------------------------------------------------------------

function dostop ()
 {phase = false;
  showcontrollermove(step);
  var move = nil;
  if (movelog.length > 0) {move = movelog[movelog.length-1]};
  for (var i=0; i<players.length; i++)
      {askstop(matchid,roles[i],move,players[i],addresses[i])}}

function askstop (matchid,role,move,player,address)
 {postStop(role,address + '/director/' + player + '/stop?match=' + matchid + '&move=' + printit(move),'');
  return true}

function postStop (role,url,args)
 {var request = false;
  if (window.XMLHttpRequest)
     {request = new XMLHttpRequest();
      if (request.overrideMimeType)
         {request.overrideMimeType('text/xml');}}
  else if (window.ActiveXObject)
          {try {request = new ActiveXObject('Msxml2.XMLHTTP')}
           catch (e) {try {request = new ActiveXObject('Microsoft.XMLHTTP')}
                      catch (e) {} }};
  request.onreadystatechange = function () {alertStop(role,request)};
  request.open('GET', url, true);
  request.send(args);
  return true}

function alertStop (role,request)
 {if (request.readyState == 4)
     {if (request.responseText)
         {endstop(role,request.responseText)}
      else {alert('There was a problem with the request in alertResult.')}}}

function endstop (answer)
 {if (trace) {alert(role + ': ' + answer)};
  return true}

//------------------------------------------------------------------------------

var timer=0 

function timeeval (action,time)
 {var timer = document.getElementById('timer').innerHTML = time;
  setTimeout(action,time * 1000);
  return true}

function stepeval (action,time)
 {document.getElementById('timer').innerHTML = time;
  if (time <= 0)
     {if (phase) {eval(action)};
      return true};
  setTimeout(function () {stepeval(action,time-1)},1000);
  return false}

//------------------------------------------------------------------------------
// gameplayer stuff
//------------------------------------------------------------------------------

var matchid='m01';
var roles=seq('white','black');
var role='white';
var startclock=0;
var playclock=0;
var state=seq();
var herstory=seq();
var movelog=seq();
var step=0;

//------------------------------------------------------------------------------

function start (id,rol,rs,s,e)
 {library = definemorerules(seq(),rs);
  roles = findroles(library);
  matchid = rol;
  role = rol;
  startclock = s;
  playclock = e;
  state = findinits(library);
  herstory = seq(nil,state);
  movelog = seq(nil);
  step = 1;
  return 'ready'}

function play (move)
 {if (move != 'nil')
     {movelog[step] = move;
      step = step+1;
      var facts = doesify(roles,move).concat(truify(state));
      state = findnexts(facts,library);
      herstory[step] = state};
  return true}

//------------------------------------------------------------------------------

indexing = false;
ruleindexing = true;

function doesify (roles,actions)
 {var exp = seq();
  for (var i=0; i<roles.length; i++)
      {exp[i] = seq('does',roles[i],actions[i])};
  return exp}

function truify (state)
 {var exp = seq();
  for (var i=0; i<state.length; i++)
      {exp[i] = seq('true',state[i])};
  return exp}

function findroles (rules)
 {return compfinds('R',seq('role','R'),seq(),rules)}

function findinits (rules)
 {return compfinds('P',seq('init','P'),seq(),rules)}

function findlegalp (role,ply,facts,rules)
 {return compfindp(seq('legal',role,ply),facts,rules)}

function findlegalx (role,facts,rules)
 {return compfindx('X',seq('legal',role,'X'),facts,rules)}

function findlegals (role,facts,rules)
 {return compfinds('X',seq('legal',role,'X'),facts,rules)}

function findnexts (facts,rules)
 {return compfinds('P',seq('next','P'),facts,rules).sort()}

function findterminal (facts,rules)
 {return compfindp('terminal',facts,rules)}

function findreward (role,facts,rules)
 {return compfindx('R',seq('goal',role,'R'),facts,rules)}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------