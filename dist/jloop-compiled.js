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


},{"./utils":7}],3:[function(require,module,exports){
window.jloop = require("./jloop");


},{"./jloop":4}],4:[function(require,module,exports){
var config = require("./config");
var model = require("./model");
var session = require("./session");
var utils = require("./utils");
var err = require("./exceptions");

/**
 * @class JLoopChat
 */
var jLoopChat = function(spec, my) {
  // Private
  //
  var _fnOnAgentMessage = null;
  var _fnOnAgentStatusChange = null;

  function _addToTranscript(e) {
    var transcript = session.get("transcript", session.Transcript);
    transcript.addEvent(e);
  }

  function _checkInitialised() {
    if (my.initialised === false) {
      throw new err.JLoopException("jLoopChat not initialised");
    }
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

    _addToTranscript(e);

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
  that.visitorId = null;

  that.getTranscript = function() {
    return session.get("transcript", session.Transcript);
  };

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
    that.visitorId = session.get("visitorId");

    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "http://" + config.serverLookupBaseUri + "/endpoint?cid=" + that.customerId, true);
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 200) {
          my.endpoint = new model.ServerEndpoint(JSON.parse(xhttp.responseText));
          var baseUrl = my.endpoint.url.replace(/^.*?:\/\//g, "");

          my.websocket = new WebSocket("ws://" + baseUrl + "/api/customer/" + that.customerId + "/socket/" + that.visitorId);
          my.websocket.onmessage = _onMessage;
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

    _addToTranscript(msg);

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
      visitorId: that.visitorId,
      visitorName: visitorName,
      customerId: that.customerId,
      agentId: agentId,
      status: "online"
    });

    _addToTranscript(event);

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
      visitorId: that.visitorId,
      visitorName: visitorName,
      customerId: that.customerId,
      agentId: agentId,
      status: "offline"
    });

    _addToTranscript(event);

    console.log("Sending..."); // TODO
    console.log(event);

    my.websocket.send(JSON.stringify(event));

    return event;
  };

  return that;
};

module.exports = {
  jLoopChat: jLoopChat,
  model: model,
  session: session,
  error: err
};


},{"./config":1,"./exceptions":2,"./model":5,"./session":6,"./utils":7}],5:[function(require,module,exports){
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
  fromPojo: fromPojo
};


},{"./exceptions":2,"./utils":7}],6:[function(require,module,exports){
var model = require("./model");

const _NAMING_PREFIX = "jl_";

var _lifetime = 24 * 60 * 60;

function _SessionValue(value) {
  this.value = value;
}

function _generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);

    return v.toString(16);
  });
}

function _k(key) {
  return _NAMING_PREFIX + key;
}

function _clear() {
  for (var i = 0; i < localStorage.length; ++i) {
    var key = localStorage.key(i);
    if (key.startsWith(_NAMING_PREFIX)) {
      localStorage.removeItem(key);
      --i;
    }
  }
}

function _get(key, type) {
  var item = localStorage.getItem(_k(key));
  if (item === null) {
    return null;
  }

  var obj = JSON.parse(item).value;
  return type != null ? new type(obj) : obj;
}

function _put(key, value) {
  localStorage.setItem(_k(key), JSON.stringify(new _SessionValue(value)));
}

function _remove(key) {
  localStorage.removeItem(_k(key));
}

function _createNewSession() { // TODO: Accept name for session
  _clear();

  _put("visitorId", _generateUuid());
  _put("visitorName", "");
  _put("transcript", new Transcript());
  _put("_expirationDate", (new Date()).getTime() + _lifetime * 1000);
}

function Transcript(spec) {
  spec = spec || {};

  // List of model.Event objects
  this.events = [];
  this._key = spec.key || "transcript";

  if (spec.events != null) {
    for (var i = 0; i < spec.events.length; ++i) {
      this.events.push(model.fromPojo(spec.events[i]));
    }
  }
};

Transcript.prototype.addEvent = function(event) {
  this.events.push(event);
  put(this._key, this);
};

Transcript.prototype.clear = function() {
  this.events = [];
  put(this._key, this);
};

Transcript.prototype.isEmpty = function() {
  return this.events.length === 0;
};

function remove(key) {
  if (hasExpired()) {
    _createNewSession();
  }

  _remove(key);
}

function clear() {
  _createNewSession();
}

function hasExpired() {
  var expiration = localStorage.getItem(_k("_expirationDate"));
  return expiration === null || expiration < (new Date()).getTime();
}

function get(key, type) {
  if (hasExpired()) {
    _createNewSession();
  }

  return _get(key, type);
}

function put(key, value) {
  if (hasExpired()) {
    _createNewSession();
  }

  _put(key, value);
}

function setLifetime(seconds) {
  _lifetime = seconds;
  _put("_expirationDate", (new Date()).getTime() + _lifetime * 1000);
}

module.exports = {
  Transcript: Transcript,
  setLifetime: setLifetime,
  hasExpired: hasExpired,
  remove: remove,
  get: get,
  put: put,
  clear: clear
};


},{"./model":5}],7:[function(require,module,exports){
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


},{}]},{},[1,2,3,4,5,6,7]);
