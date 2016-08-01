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

