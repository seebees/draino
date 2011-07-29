var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    /**
     * shorthand for
     * Array.prototype.slice.call(object, ...)
     */
    slice       = exports.slice     = (function (slice) {
        return function (object) {
            return slice.apply(object, slice.call(arguments, 1));
        };
    }([].slice)),
    /**
    * Nice function to apply the properties of source to target
    */
    mixin       = exports.mixin     = function (target, source) {
        target = target || {};
        Object.keys(source).forEach(function (key) {
            target[key] = source[key];
        });
      
        return target;
    },
    /**
     * simple function to put the whole implementation in one place
     * it wraps util.inherits()
     * @param parent        the parent (first for readability)
     * @param child         the constructor function
     * @param prototype     an object literal to append to child.prototype
     */
    inherit     = exports.inherit   = function (parent, child, prototype) {
        if (typeof child !== 'function') {
            if (typeof child === 'object') {
                prototype = child;
            }
            child = function () {
                parent.apply(this, arguments);
            };
        }
        util.inherits(child, parent);
        
        if (prototype) {
            child.prototype = exports.mixin(child.prototype, prototype);
        }
        
        return child;
    },
    /**
     * A helper function to tell the world we are done flushing
     */
    tell        = exports.tell      = function (toEvent, data, error, cares) {
        if (cares instanceof EventEmitter) {
            (!error                                  ?
                cares.emit(toEvent, data)            :
                cares.emit('error', error, data));
        } else if (typeof cares === 'function') {
            cares(error, data);
        } else if (Array.isArray(cares)) {
            return cares.forEach(exports.tell.bind(this, toEvent, data, error));
        }
    };