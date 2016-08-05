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
  that.visitorId = utils.generateUuid();
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
    that.visitorId = that.session.get("visitorId");

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
      visitorId: that.visitorId,
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
      visitorId: that.visitorId,
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

  return that;

  // PRIVATE FUNCTIONS

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
  var _lifetime = 24 * 60 * 60;
  var _naming_prefix = uniquePrefix || "jl";

  /**
   * @method setLifetime
   * @param {Number} seconds
   */
  function setLifetime(seconds) {
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

  return {
    setLifetime: setLifetime,
    put: put,
    remove: remove,
    clear: clear,
    hasExpired: hasExpired,
    get: get
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
    _session.put(_transcript);
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

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);

    return v.toString(16);
  });
}

module.exports = {
  inherits: inherits,
  bind: bind,
  dictToArray: dictToArray,
  generateUuid: generateUuid
};


},{}],9:[function(require,module,exports){
module.exports = function() {
  return {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'jasmine'],


    // list of files / patterns to load in the browser
    files: [
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'unit/*.js': ['browserify']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['spec'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  };
};

},{}],10:[function(require,module,exports){
var conf = require("./karma-shared.conf.js")();

module.exports = function(config) {
  conf.files = conf.files.concat([
    'unit/**.js'
  ]);

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  conf.logLevel = config.LOG_INFO;

  config.set(conf);
};

},{"./karma-shared.conf.js":9}],11:[function(require,module,exports){

},{}],12:[function(require,module,exports){
var test = test || {};

test.mockWindow = function() {
  var _x = 0, _y = 0;
  var _elem = jQuery(window);

  this.scrollLeft = function(x) {
    if (typeof x === "undefined") {
      return _x;
    }
    else {
      _x = x;
    }
  };

  this.scrollTop = function(y) {
    if (typeof y === "undefined") {
      return _y;
    }
    else {
      _y = y;
    }
  };

  this.get = function(i) {
    return _elem.get(i);
  };

  this.on = function(str, fn) {
    _elem.on(str, fn);
  };

  this.triggerHandler = function(str) {
    _elem.triggerHandler(str);
  };
};

},{}],13:[function(require,module,exports){
"use strict";

var sessions = require("../../js/session");
var model = require("../../js/model");

describe("session", function() {
  jasmine.clock().install();
  var baseTime = new Date(2000, 1, 1);

  beforeEach(function() {
    jasmine.clock().mockDate(baseTime);
  });

  it("should clear values", function() {
    var session = sessions.session();
    session.put("foo", "bar");
    session.clear();

    expect(session.get("foo")).toBe(null);
  });

  it("should store values", function() {
    var session = sessions.session();
    session.put("foo", "bar");
    expect(session.get("foo")).toBe("bar");
  });

  it("should store complex objects", function() {
    var session = sessions.session();

    function Thing(spec) {
      spec = spec || {};

      this.a = spec.a || 0;
      this.b = spec.b || "";
      this.c = {
        d: spec.c.d || 0.0
      };
    }

    Thing.prototype.foo = function() {
      return this.a * this.c.d;
    };

    var obj = new Thing({
      a: 2,
      b: "three",
      c: {
        d: 4.1
      }
    });

    session.put("obj", obj);
    var obj2 = session.get("obj", Thing);

    expect(obj2.a).toBe(2);
    expect(obj2.b).toBe("three");
    expect(obj2.c.d).toBe(4.1);

    expect(obj2.foo()).toBe(8.2);
  });

  it("should remove values", function() {
    var session = sessions.session();

    session.put("foo", "bar");
    session.remove("foo");
    expect(session.get("foo")).toBe(null);
  });

  it("Should expire", function() {
    var session = sessions.session();

    session.setLifetime(4);
    session.put("foo", "bar");

    jasmine.clock().tick(4000);;
    expect(session.get("foo")).toBe("bar");

    jasmine.clock().tick(1);
    expect(session.get("foo")).toBe(null);
  });

  it("should contain same data for instances with the same prefix", function() {
    var session1 = sessions.session("s1");
    var session2 = sessions.session("s2");

    session1.put("foo", 123);
    session2.put("foo", 456);

    expect(session1.get("foo")).toBe(123);
    expect(session2.get("foo")).toBe(456);
  });

  it("should contain different data for instances with different prefixes", function() {
    var session1 = sessions.session("s1");
    var session2 = sessions.session("s1");

    session1.put("foo", 123);
    session2.put("foo", 456);

    expect(session1.get("foo")).toBe(456);
    expect(session2.get("foo")).toBe(456);
  });

  it("should store and restore a Transcript instance", function() {
    var session = sessions.session();

    var t1 = new model.Transcript();
    var e1 = new model.VisitorMessage({
      customerId: "abc",
      agentId: "def",
      visitorId: "ace",
      message: "Hello"
    });

    t1.addEvent(e1);

    session.put("transcript", t1);

    var t2 = session.get("transcript", model.Transcript);
    var e2 = t2.events[0];

    expect(e2.customerId).toBe(e1.customerId);
    expect(e2.agentId).toBe(e1.agentId);
    expect(e2.visitorId).toBe(e1.visitorId);
    expect(e2.message).toBe(e1.message);
  });
});


},{"../../js/model":5,"../../js/session":6}],14:[function(require,module,exports){
"use strict";

var model = require("../../js/model");
var sessions = require("../../js/session");
var syncedTranscript = require("../../js/syncedTranscript");

describe("syncedTranscript", function() {
  it("should log events", function() {
    var session = sessions.session();
    var t1 = syncedTranscript(session);

    var e1 = new model.VisitorMessage({
      customerId: "abc",
      agentId: "def",
      visitorId: "ace",
      message: "Hello"
    });

    t1.addEvent(e1);

    var e2 = t1.getEvents()[0];

    expect(e2.customerId).toBe(e1.customerId);
    expect(e2.agentId).toBe(e1.agentId);
    expect(e2.visitorId).toBe(e1.visitorId);
    expect(e2.message).toBe(e1.message);
  });

  it("should extract transcript from session", function() {
    var session = sessions.session();
    var t1 = syncedTranscript(session);

    var e1 = new model.VisitorMessage({
      customerId: "abc",
      agentId: "def",
      visitorId: "ace",
      message: "Hello"
    });

    t1.addEvent(e1);

    var t2 = syncedTranscript(session);
    var e2 = t2.getEvents()[0];

    expect(e2.customerId).toBe(e1.customerId);
    expect(e2.agentId).toBe(e1.agentId);
    expect(e2.visitorId).toBe(e1.visitorId);
    expect(e2.message).toBe(e1.message);
  });
});


},{"../../js/model":5,"../../js/session":6,"../../js/syncedTranscript":7}]},{},[1,2,3,4,5,6,7,8,9,10,11,12,13,14]);
