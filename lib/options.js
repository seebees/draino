var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    /**
     * shorthand for
     * Array.prototype.slice.call(object, ...)
     */
    slice = (function (slice) {
        return function (object) {
            return slice.apply(object, slice.call(arguments, 1));
        };
    }([].slice));

/**
 * A helper function to tell the world we are done flushing
 */
exports.tell = function (toEvent, data, error, cares) {
    if (cares instanceof EventEmitter) {
        (!error                                  ?
            cares.emit(toEvent, data)            :
            cares.emit('error', error, data));
    } else if (typeof cares === 'function') {
        cares(error, data);
    } else if (Array.isArray(cares)) {
        return cares.forEach(exports.tell.bind(null, toEvent, data, error));
    }
}


/**
 * 
 */
exports.newOp = function(options) {
    var op = {},
        setString = function (name, value) {
            if (typeof value === 'string') {
                options[name] = value;
            }
            return op.getSelf();
        },
        setArray = function(name, data) {
            
            if (arguments.length === 1 && !options.hasOwnProperty(name)) {
                options[name] = data;
            } else if (options.hasOwnProperty(name)) {
                if (Array.isArray(options[name])) {
                    options[name] = options[name].concat(slice(arguments));
                } else {
                    options[name] = [options[name]].concat(slice(arguments));
                }
                
            } else {
                options[name] = slice(arguments);
            }
            
            return op.getSelf();
        },
        setFn =  function (name, fn) {
            if (typeof value === 'function') {
                options[name] = fn;
            }
            return op.getSelf();
        },
        setEmitter = function(name, value){
            if (value instanceof EventEmitter){
                options.self = value;
            } else {
                options.self = new EventEmitter();
            }
            return op.getSelf();
        };
        
    /**
     * 
     */
    op.getSelf = function () {
        return op;
    };
    
    return {
        'op'        : op,
        'string'    : setString,
        'array'     : setArray,
        'emitter'   : setEmitter,
        'fn'        : setFn
    };
    
};