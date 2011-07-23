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
 * Nice function to apply the properties of source to target
 */
exports.mixin     = function (target, source) {
    target = target || {};
    Object.keys(source).forEach(function (key) {
        target[key] = source[key];
    });
  
    return target;
};

/**
 * simple function to put the whole implementation in one place
 * it wraps util.inherits()
 * @param parent        the parent (first for readability)
 * @param child         the constructor function
 * @param prototype     an object literal to append to child.prototype
 */
exports.inherit = function (parent, child, prototype) {
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
};

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
        return cares.forEach(exports.tell.bind(this, toEvent, data, error));
    }
};


/**
 * 
 */
exports.newOp = function (options) {
    var op = {},
        setString = function (name, value) {
            if (typeof value === 'string') {
                options[name] = value;
            }
            return op.getSelf();
        },
        setNumber = function (name, value) {
            if (!isNaN(parseInt(value, 10))) {
                options[name] = value;
            }
            return op.getSelf();
        },
        setArray = function (name, data) {
            if (arguments.length === 2 && !options.hasOwnProperty(name)) {
                options[name] = data;
            } else if (options.hasOwnProperty(name)) {
                if (Array.isArray(options[name])) {
                    options[name] = options[name].concat(slice(arguments));
                } else {
                    options[name] = [options[name]].concat(slice(arguments));
                }
                
            } else {
                options[name] = slice(arguments, 1);
            }
            
            return op.getSelf();
        },
        setFn =  function (name, value) {
            if (typeof value === 'function') {
                options[name] = value;
            }
            return op.getSelf();
        },
        setEmitter = function (value) {
            if (value instanceof EventEmitter) {
                options.self = value;
            } else {
                options.self = new EventEmitter();
            }
            return op.getSelf();
        },
        decorate = function() {
            op.flush = function () {
                options.engine(options);
                Object.keys(op).forEach(function (key) {
                    if (key !== 'getSelf') {
                        delete options.self[key];
                    }
                });
                return options.self;
            };
            
            Object.keys(op).forEach(function (key) {
                if (key !== 'getSelf') {
                    options.self[key] = op[key];
                }
            });
        };
        
        
    /**
     * 
     */
    op.getSelf = function () {
        return op;
    };
    
    op.flush = function () {
        options.engine(options);
        return options.self;
    };
    
    return {
        'op'        : op,
        'string'    : setString,
        'number'    : setNumber,
        'array'     : setArray,
        'emitter'   : setEmitter,
        'fn'        : setFn,
        'decorate'  : decorate
    };
    
};