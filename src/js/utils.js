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

