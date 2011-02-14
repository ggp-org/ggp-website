if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    var F = function () {}
    F.prototype = o;
    return new F();
  }
}

var NetworkMessage = {
  address: "",
  request: "",
  callback: null,
  
//  completed: true,
  
  initialize: function (addr, req, cbk) {
    this.address = addr;
    this.request = req;
    this.callback = cbk;
  },
    
  receivedCallback: function (request, callback) {
    console.log('READY STATE: ' + request.readyState);
    console.log('RECEIVED: ' + request.responseText);
  },

//  timeoutCallback: function () {
//    this.callback(null);
//  },
  
  sendMessage: function () {
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
    };
    
    var x = this.receivedCallback;
    var y = this.callback;
    request.onreadystatechange = function () { x(request, y) };
    request.open('GET', this.address, true);
    request.send('');
  },
    
//  sendMessageWithTimeout: function (timeout) {
//    this.completed = false;
//    setTimeout(???, timeout);
//    this.sendMessage(); 
//},
}