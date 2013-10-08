"use strict";

var ResourceLoader = {

  // This function can load two types of rulesheets: KIF and HRF.
  // These formats are interchangeable in a straightforward way,
  // and given a URL for either it will load the rulesheet and
  // automatically generate its counterpart in the other format.
  // 
  // It will return an array with two elements: the HRF rules,
  // readable by the JS GGP libraries, and the KIF rules, which are
  // the standard format for describing games.
  //
  // The HRF rules should be used for instantiating the state machine.
  // The KIF rules can be displayed to the end user, if desired.
  load_rulesheet: function (url) {
    if (url.length < 3) { return [] };
    var type = url.slice(url.length-3).toLowerCase();
    if (type == 'kif') { return this.internals.importkif(url) };
    if (type == 'hrf') { return this.internals.importhrf(url) };
    return []
  },

  load_xml: function (url) {
    return this.internals.load_data(url)[1];
  },

  load_js: function (url) {
      return eval('('+this.internals.load_data(url)[0]+')');
  },
  
  load_json: function (url) {
      return JSON.parse(this.internals.load_data(url)[0]);
  },    
  
  load_raw: function (url) {
    return this.internals.load_data(url)[0];
  },
  
  post_raw: function (url, content, contentType) {
    return this.internals.post_data(url, content, contentType)[0];
  },
  
  load_raw_async_with_timeout: function (url, callback, timeout) {
    var doneCallback, timeoutCallback;
    {
      var completed = false;
      doneCallback = function (response) {
        if (completed) return;
        completed = true;
        callback(response);
      }
      timeoutCallback = function () {
        if (completed) return;
        completed = true;
        callback(null);
      }
    }
    if (timeout) {
      setTimeout(timeoutCallback, timeout);
    }
    this.internals.load_raw_async(url, doneCallback);
  },
  
  post_raw_async_with_timeout: function (url, content, callback, timeout) {
      var doneCallback, timeoutCallback;
      {
        var completed = false;
        doneCallback = function (response) {
          if (completed) return;
          completed = true;
          callback(response);
        }
        timeoutCallback = function () {
          if (completed) return;
          completed = true;
          callback(null);
        }      
      }
      setTimeout(timeoutCallback, timeout);
      this.internals.post_raw_async(url, content, doneCallback);
  },  
  
  // For stylesheets, we load both the raw text, and the XML document.
  load_stylesheet: function (url) {
    return this.internals.load_data(url);
  },  
  
  internals : {
    load_data: function (url) {
      var xhttp = new XMLHttpRequest();      
      xhttp.open("GET", url, false);
      xhttp.send("");
      if (xhttp.responseText) {
        return [xhttp.responseText, xhttp.responseXML]
      }
      alert('Cannot load: ' + url);
      return false
    },
    
    post_data: function (url, content, contentType) {
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", url, false);
        if (contentType != null) {
          xhttp.setRequestHeader("Content-type", contentType);
        }
        xhttp.send(content);
        if (xhttp.responseText) {
          return [xhttp.responseText, xhttp.responseXML]
        }
        alert('Cannot post: ' + url);
        return false
    },    
    
    load_raw_async: function (url, callback) {
      var handler = function() {
        if(this.readyState == 4 && this.status == 200) {
          callback(xhttp.responseText);
        } else if (this.readyState == 4 && this.status != 200) {
          callback(null);
        }
      }
      
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = handler;
      xhttp.open("GET", url, true);        
      xhttp.send("");        
    },
    
    post_raw_async: function (url, content, callback) {
        var handler = function() {
          if(this.readyState == 4 && this.status == 200) {
            callback(xhttp.responseText);
          } else if (this.readyState == 4 && this.status != 200) {
            callback(null);
          }
        }

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = handler;
        xhttp.open("POST", url, true);
        xhttp.send(content);
    },    
  
    importkif: function (url) {
      var rulesheet = this.load_data(url)[0];
      var rules = readkifdata(rulesheet);

      var right_rules = grindem(rules);
      var print_rules = printem(rules);
      
      return [right_rules, print_rules];
    },

    importhrf: function (url) {
      var rulesheet = this.load_data(url)[0];

      var right_rules = rulesheet;
      var print_rules = printem(readdata(rulesheet));
      
      return [right_rules, print_rules];
    }
  }
}