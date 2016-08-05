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

