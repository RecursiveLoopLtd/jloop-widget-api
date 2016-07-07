var $ = require("../../vendor/jquery/dist/jquery");
var jloop = require("./jloop");
var model = require("./model");
var session = require("./session");
var utils = require("./utils");

function widgetClosed(jl, root) {
  var _jl = jl;
  var _eRoot = root;
  var _eOuter = null;
  var _fnOnClick = null;

  function _onClick() {
    if (_fnOnClick) {
      _fnOnClick();
    }
    return false;
  }

  var that = that || {};

  that.html = 
    "<div class='jloop jl-closed'>" +
    "  <div class='jl-tab jl-minimised'></div>" +
    "</div>";

  that.activate = function() {
    _eTab = _eRoot.find(".jl-tab");
    _eTab.on("click", _onClick);
  };

  that.setOnClick = function(fn) {
    _fnOnClick = fn;
  };

  that.deactivate = function() {};

  return that;
};

function widgetOpen(jl, root) {
  var _jl = jl;
  var _eRoot = root;
  var _eFrmMain = null;
  var _eTxtName = null;
  var _eSctAgents = null;
  var _eTranscript = null;
  var _eTxtMessage = null;
  var _eBtnClose = null;
  var _eBtnClearSession = null; // TODO

  var _fnOnClick = null;

  // Maps agent IDs to agents
  var _agents = {};

  function _appendToTranscript(event) {
    if (event.eventType == "VisitorMessage" || event.eventType == "AgentMessage") {
      _eTranscript.append(
        "<span class='jl-timestamp'>" + new Date(event.timestamp).toTimeString().slice(0, 9) + "</span>");

      if (event.eventType == "VisitorMessage") {
        _eTranscript.append(
          "<span class='jl-visitor-name'>" + event.visitorName + "</span> ");
      }
      else if (event.eventType == "AgentMessage") {
        var agentName = _agents[event.agentId].displayName;

        _eTranscript.append(
          "<span class='jl-agent-name'>" + agentName + "</span> ");
      }

      _eTranscript.append(
        "<span class='jl-agent-msg'>" + event.message + "</span><br>");
    }
  }

  function _onSend() {
    var msg = new model.VisitorMessage({
      customerId: _jl.customerId,
      agentId: _eSctAgents.val(),
      visitorId: _jl.visitorId,
      visitorName: _eTxtName.val(),
      message: _eTxtMessage.val(),
      timestamp: new Date().getTime()
    });

    session.put("visitorName", _eTxtName.val());
    var transcript = session.get("transcript", session.Transcript);
    transcript.addEvent(msg);
    session.put("transcript", transcript);

    _jl.sendMessage(msg);
    _eTxtMessage.val("");
    _appendToTranscript(msg);

    return false;
  }

  function _onClose() {
    var agentId = _eSctAgents.val();
    _jl.closeConnection(agentId);

    // TODO: Append to transcript
  }

  function _onAgentStatusChange(e) {
    _appendToTranscript(e);

    // TODO
  }

  function _onAgentMessage(e) {
    _appendToTranscript(e);
  }

  function _loadName() {
    _eTxtName.val(session.get("visitorName"));
  }

  function _loadAgents() {
    var result = new utils.Future();

    _jl.fetchAgents(function(data) {
      data.agents.forEach(function(agent) {
        _agents[agent.agentId] = agent;

        _eSctAgents.append($("<option>", {
          text: agent.displayName,
          value: agent.agentId
        }));
      });

      result.ready();
    },
    function(status) {
      console.log("Error retrieving agents list. Server returned code " + status);
      result.ready();
    });

    return result;
  }

  function _loadTranscript() {
    var transcript = session.get("transcript", session.Transcript);

    _eTranscript.html("");
    for (var i = 0; i < transcript.events.length; ++i) {
      var event = transcript.events[i];
      _appendToTranscript(event);
    }
  }

  function _onClick() {
    if (_fnOnClick) {
      _fnOnClick();
    }
  };

  var that = that || {};

  that.html = 
    "<div class='jloop jl-open'>" +
    "  <div class='jl-tab'></div>" +
    "  <form class='jl-frm-main'>" +

    "    <strong>Name</strong>" +
    "    <input class='jl-txt-name' type='text'></input><br>" +

    "    <strong>Agent</strong>" +
    "    <select class='jl-sct-agents'></select><br>" +

    "    <div class='jl-transcript'></div><br>" +

    "    <textarea class='jl-txt-message'></textarea><br>" +

    "    <input type='submit' value='Send'>" +
    "    <button type='button' class='jl-btn-close'>Close Connection</button>" +
    "    <button type='button' class='jl-btn-clear-session'>Clear session</button>" +

    "  </form>" +
    "</div>";

  that.activate = function() {
    _eFrmMain = _eRoot.find(".jl-frm-main");
    _eTxtName = _eRoot.find(".jl-txt-name");
    _eSctAgents = _eRoot.find(".jl-sct-agents");
    _eTranscript = _eRoot.find(".jl-transcript");
    _eTxtMessage = _eRoot.find(".jl-txt-message");
    _eBtnClose = _eRoot.find(".jl-btn-close");
    _eTab = _eRoot.find(".jl-tab");

    _eBtnClearSession = _eRoot.find(".jl-btn-clear-session"); // TODO
    _eBtnClearSession.on("click", function() {
      session.clear();
      return false;
    });

    _jl.initialise(function() {
      _loadName();
      _loadAgents().then(function() {
        _loadTranscript();

        _jl.setOnAgentMessage(_onAgentMessage);
        _jl.setOnAgentStatusChange(_onAgentStatusChange);
      });
    },
    function() {
      console.log("Error initialising jloopChat");
    });

    _eFrmMain.on("submit", _onSend);
    _eBtnClose.on("click", _onClose);
    _eTab.on("click", _onClick);
  };

  that.deactivate = function() {};

  that.setOnClick = function(fn) {
    _fnOnClick = fn;
  };

  return that;
};

function jLoopClassic(spec, my) {
  // Protected
  //
  my = my || {};
  my.jloop = jloop.jLoopChat(spec);

  // Private
  //
  var _eRoot = $("#" + spec.parentElementId);

  var _states = [
    widgetClosed(my.jloop, _eRoot),
    widgetOpen(my.jloop, _eRoot)
  ];
  var _ST_CLOSED = 0;
  var _ST_OPEN = 1;
  var _currentState = null;

  _states[_ST_CLOSED].setOnClick(function() {
    _applyState(_ST_OPEN);
  });

  _states[_ST_OPEN].setOnClick(function() {
    _applyState(_ST_CLOSED);
  });

  function _applyState(idx) {
    if (_currentState) {
      _currentState.deactivate();
    }
    _currentState = _states[idx];
    _eRoot.html(_currentState.html);
    _currentState.activate();
  }

  _applyState(_ST_CLOSED);

  // Public
  //
  var that = {};

  return that;
}

module.exports = {
  jLoopClassic: jLoopClassic
};

