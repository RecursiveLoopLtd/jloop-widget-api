(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.serverLookupBaseUri = "52.43.50.221:9090/core-lookup/api";


},{}],2:[function(require,module,exports){
var utils = require("./utils");

function JLoopException(msg) {
  this.message = msg;
}

function ServerException(msg, status) {
  JLoopException.call(this, msg);
  this.status = status;
}

utils.inherits(ServerException, JLoopException);

module.exports = {
  JLoopException: JLoopException,
  ServerException: ServerException
};


},{"./utils":8}],3:[function(require,module,exports){
window.jloop = require("./jloop");


},{"./jloop":4}],4:[function(require,module,exports){
var config = require("./config");
var model = require("./model");
var sessions = require("./session");
var utils = require("./utils");
var err = require("./exceptions");
var syncedTranscript = require("./syncedTranscript");

/**
 * @class JLoopChat
 */
var jLoopChat = function(spec, my) {
  // Private
  //
  var _fnOnAgentMessage = null;
  var _fnOnAgentStatusChange = null;

  // Protected
  //
  my = my || {};
  my.initialised = false;
  my.websocket = null;
  my.endpoint = null;

  // Public
  //
  var that = {};
  that.customerId = spec.customerId;
  that.session = sessions.session(spec.uniquePrefix || "jl");
  that.transcript = syncedTranscript(that.session);

  that.setOnAgentMessage = function(fn) {
    _fnOnAgentMessage = fn;
  };

  that.setOnAgentStatusChange = function(fn) {
    _fnOnAgentStatusChange = fn;
  };

  /**
  * @method initialise
  * @param {Function} fnSuccess A no-argument function
  * @param {Function} fnFailure (Optional) A no argument function
  */
  that.initialise = function(fnSuccess, fnFailure) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "http://" + config.serverLookupBaseUri + "/endpoint?cid=" + that.customerId, true);
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 200) {
          my.endpoint = new model.ServerEndpoint(JSON.parse(xhttp.responseText));

          _createWebsocket();
          my.initialised = true;

          fnSuccess();
        }
        else {
          if (fnFailure) {
            fnFailure();
          }
        }
      }
    };
    xhttp.send();
  };

  /**
  * @method fetchAgents
  * @param {Function} fnSuccess A function that accepts an AgentList
  * @param {Function} fnFailure A function that accepts a numeric status code
  */
  that.fetchAgents = function(fnSuccess, fnFailure) {
    _checkInitialised();

    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", my.endpoint.url + "/api/customer/" + that.customerId + "/agent", true);
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 200) {
          fnSuccess(new model.AgentList(JSON.parse(xhttp.responseText)));
        }
        else {
          fnFailure(xhttp.status);
        }
      }
    };
    xhttp.send();
  };

  /**
   * @method sendMessage
   */
  that.sendMessage = function(msg) {
    _checkInitialised();

    that.transcript.addEvent(msg);

    console.log("Sending...");
    console.log(msg);
    my.websocket.send(JSON.stringify(msg));

    return msg;
  };

  /**
   * @method openConnection
   */
  that.openConnection = function(visitorName, agentId) {
    _checkInitialised();

    var event = new model.VisitorStatusChange({
      visitorId: that.session.getId(),
      visitorName: visitorName,
      customerId: that.customerId,
      agentId: agentId,
      status: "online"
    });

    that.transcript.addEvent(event);

    console.log("Sending..."); // TODO
    console.log(event);

    my.websocket.send(JSON.stringify(event));

    return event;
  };

  /**
   * @method closeConnection
   */
  that.closeConnection = function(visitorName, agentId) {
    _checkInitialised();

    var event = new model.VisitorStatusChange({
      visitorId: that.session.getId(),
      visitorName: visitorName,
      customerId: that.customerId,
      agentId: agentId,
      status: "offline"
    });

    that.transcript.addEvent(event);

    console.log("Sending..."); // TODO
    console.log(event);

    my.websocket.send(JSON.stringify(event));

    return event;
  };

  that.reset = function(visitorName, agentId) {
    that.closeConnection(visitorName, agentId);
    that.session.clear();
    that.transcript.clear();
    _createWebsocket();
  };

  return that;

  // PRIVATE FUNCTIONS

  function _checkInitialised() {
    if (my.initialised === false) {
      throw new err.JLoopException("jLoopChat not initialised");
    }
  }

  function _createWebsocket() {
    if (my.websocket !== null) {
      my.websocket.close();
    }

    var baseUrl = my.endpoint.url.replace(/^.*?:\/\//g, "");
    my.websocket = new WebSocket("ws://" + baseUrl + "/api/customer/" + that.customerId + "/socket/" + that.session.getId());
    my.websocket.onmessage = _onMessage;
  }

  function _onAgentMessage(e) {
    if (_fnOnAgentMessage) {
      _fnOnAgentMessage(e);
    }
  }

  function _onAgentStatusChange(e) {
    if (_fnOnAgentStatusChange) {
      _fnOnAgentStatusChange(e);
    }
  }

  function _onMessage(m) {
    var e = JSON.parse(m.data);
    console.log(e);

    that.transcript.addEvent(e);

    if (e.eventType == "AgentMessage") {
      _onAgentMessage(e);
    }
    else if (e.eventType == "AgentStatusChange") {
      _onAgentStatusChange(e);
    }
    else {
      throw new err.JLoopException("Unknown event type '" + eventType + "'");
    }
  }
};

module.exports = {
  jLoopChat: jLoopChat,
  model: model,
  error: err
};


},{"./config":1,"./exceptions":2,"./model":5,"./session":6,"./syncedTranscript":7,"./utils":8}],5:[function(require,module,exports){
/**
 * Contains constructor functions for objects sent and received
 * to/from the server. Each function takes a spec object, which
 * can either be an existing object or a freshly parsed JSON
 * object (i.e. containing just string and object fields).
 *
 * @module model
 */

var err = require("./exceptions");
var utils = require("./utils");

var Event = function(eventType) {
  this.eventType = eventType;
};

function VisitorMessage(spec) {
  Event.call(this, "VisitorMessage");
  this.customerId = spec.customerId;
  this.agentId = spec.agentId;
  this.visitorId = spec.visitorId;
  this.visitorName = spec.visitorName;
  this.message = spec.message;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(VisitorMessage, Event);

function AgentMessage(spec) {
  Event.call(this, "AgentMessage");
  this.customerId = spec.customerId;
  this.agentId = spec.agentId;
  this.visitorId = spec.visitorId;
  this.visitorName = spec.visitorName;
  this.message = spec.message;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(AgentMessage, Event);

function VisitorStatusChange(spec) {
  Event.call(this, "VisitorStatusChange");
  this.visitorId = spec.visitorId;
  this.visitorName = spec.visitorName;
  this.customerId = spec.customerId;
  this.agentId = spec.agentId;
  this.status = spec.status;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(VisitorStatusChange, Event);

function AgentStatusChange(spec) {
  Event.call(this, "AgentStatusChange");
  this.agentId = spec.agentId;
  this.status = spec.status;
  this.timestamp = spec.timestamp || new Date().getTime();
};

utils.inherits(AgentStatusChange, Event);

function AgentStatus(spec) {
  this.agentId = spec.agentId;
  this.status = spec.status;
  this.timestamp = spec.timestamp || new Date().getTime();
};

function Agent(spec) {
  this.agentId = spec.agentId;
  this.customerId = spec.customerId;
  this.displayName = spec.displayName;
  this.welcomeMessage = spec.welcomeMessage;
  this.status = new AgentStatus(spec.status);
};

function AgentList(spec) {
  this.agents = spec.agents.map(function(agent) {
    return new Agent(agent);
  }) || [];
};

function ServerEndpoint(spec) {
  this.nodeId = spec.nodeId;
  this.url = spec.url;
};

function Transcript(spec) {
  spec = spec || {};

  // List of Event objects
  this.events = [];

  if (spec.events) {
    for (var i = 0; i < spec.events.length; ++i) {
      this.events.push(fromPojo(spec.events[i]));
    }
  }
};

Transcript.prototype.addEvent = function(event) {
  this.events.push(event);
};

Transcript.prototype.clear = function() {
  this.events = [];
};

Transcript.prototype.isEmpty = function() {
  return this.events.length === 0;
};

function fromPojo(pojo) {
  switch (pojo.eventType) {
    case "VisitorMessage":
      return new VisitorMessage(pojo);
    break;
    case "AgentMessage":
      return new AgentMessage(pojo);
    break;
    case "VisitorStatusChange":
      return new VisitorStatusChange(pojo);
    break;
    case "AgentStatusChange":
      return new AgentStatusChange(pojo);
    break;
    default:
      throw new err.JLoopException("No such model type");
  };
}

module.exports = {
  Event: Event,
  VisitorMessage: VisitorMessage,
  AgentMessage: AgentMessage,
  VisitorStatusChange: VisitorStatusChange,
  AgentStatusChange: AgentStatusChange,
  Agent: Agent,
  AgentStatus: AgentStatus,
  AgentList: AgentList,
  ServerEndpoint: ServerEndpoint,
  Transcript: Transcript,
  fromPojo: fromPojo
};


},{"./exceptions":2,"./utils":8}],6:[function(require,module,exports){
function session(uniquePrefix) {
  var _naming_prefix = uniquePrefix || "jl";
  var _id = _get("sessionId");
  var _lifetime = 24 * 60 * 60;

  if (_id === null) {
    clear();
  }

  if (hasExpired()) {
    clear();
  }

  /**
   * @method setLifetime
   * @param {Number} seconds
   */
  function setLifetime(seconds) {
    if (hasExpired()) {
      clear();
    }

    _lifetime = seconds;
    _put("_expirationDate", (new Date()).getTime() + _lifetime * 1000);
  }

  function put(key, value) {
    if (hasExpired()) {
      clear();
    }

    _put(key, value);
  }

  function remove(key) {
    if (hasExpired()) {
      clear();
    }

    _remove(key);
  }

  function clear() {
    for (var i = 0; i < localStorage.length; ++i) {
      var key = localStorage.key(i);

      if (key && key.lastIndexOf(_naming_prefix, 0) === 0) {
        localStorage.removeItem(key);
        --i;
      }
    }

    _resetId();
    _put("_expirationDate", (new Date()).getTime() + _lifetime * 1000);
  }

  function hasExpired() {
    var expiration = _get("_expirationDate");
    return expiration === null || expiration < (new Date()).getTime();
  }

  function get(key, type) {
    if (hasExpired()) {
      clear();
    }

    return _get(key, type);
  }

  function getId() {
    if (hasExpired()) {
      clear();
    }

    return _id;
  }

  return {
    setLifetime: setLifetime,
    put: put,
    remove: remove,
    clear: clear,
    hasExpired: hasExpired,
    get: get,
    getId: getId
  };

  // PRIVATE FUNCTIONS

  function _SessionValue(value) {
    this.value = value;
  }

  function _k(key) {
    return _naming_prefix + key;
  }

  function _put(key, value) {
    localStorage.setItem(_k(key), JSON.stringify(new _SessionValue(value)));
  }

  function _get(key, type) {
    var item = localStorage.getItem(_k(key));
    if (item === null) {
      return null;
    }

    var obj = JSON.parse(item);
    return type != null ? new type(obj.value) : obj.value;
  }

  function _remove(key) {
    localStorage.removeItem(_k(key));
  }

  function _resetId() {
    _id = _generateUuid();
    _put("sessionId", _id);
  }

  function _generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c == 'x' ? r : (r & 0x3 | 0x8);

      return v.toString(16);
    });
  }
}

module.exports = {
  session: session
};


},{}],7:[function(require,module,exports){
var model = require("./model");

function syncedTranscript(session) {
  var _session = session;
  var _transcript = _session.get("transcript", model.Transcript) || new model.Transcript();

  function addEvent(e) {
    _transcript.addEvent(e);
    _session.put("transcript", _transcript);
  }

  function clear() {
    _transcript.clear();
    _session.put("transcript", _transcript);
  }

  function isEmpty() {
    return _transcript.isEmpty();
  }

  function getEvents() {
    return _transcript.events;
  }

  return {
    addEvent: addEvent,
    clear: clear,
    isEmpty: isEmpty,
    getEvents: getEvents
  };
}

module.exports = syncedTranscript;


},{"./model":5}],8:[function(require,module,exports){
/**
 * @module utils
 */

function inherits(ctor, superCtor) {
  ctor.prototype = Object.create(superCtor.prototype);
  ctor.prototype.constructor = ctor;
}

function bind(context, fn) {
  var args = Array.prototype.slice.call(arguments);

  return function() {
    return fn.apply(context, args.concat(Array.prototype.slice.call(arguments)));
  };
}

function dictToArray(dict) {
  var res = [];
  for (key in dict) {
    if (dict.hasOwnProperty(key)) {
      res.push({ key: key, value: dict[key] });
    }
  }
  return res;
}

module.exports = {
  inherits: inherits,
  bind: bind,
  dictToArray: dictToArray
};


},{}]},{},[1,2,3,4,5,6,7,8]);
