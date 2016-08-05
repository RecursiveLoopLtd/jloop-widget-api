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

