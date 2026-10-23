// src/engine/events.js | Owner: P1 | Tiny event-emitter used by the game engine.

function EventEmitter() {
  this._listeners = {};
}

EventEmitter.prototype.on = function (event, cb) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(cb);
};

EventEmitter.prototype.off = function (event, cb) {
  if (!this._listeners[event]) return;
  this._listeners[event] = this._listeners[event].filter(function (fn) {
    return fn !== cb;
  });
};

EventEmitter.prototype.emit = function (event, payload) {
  var listeners = this._listeners[event];
  if (!listeners) return;
  for (var i = 0; i < listeners.length; i++) {
    listeners[i](payload);
  }
};

if (typeof module !== 'undefined') module.exports = { EventEmitter: EventEmitter };
