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

