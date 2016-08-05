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
