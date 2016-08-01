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

