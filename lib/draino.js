var util        = require('util'),
    event       = require('events'),
    EventEmitter = event.EventEmitter,
    /**
     * shorthand for
     * Array.prototype.slice.call(object, ...)
     */
    slice = (function (slice) {
        return function (object) {
            return slice.apply(object, slice.call(arguments, 1));
        };
    }([].slice)),
    tell = function(toEvent, accumulation, error, cares) {
        console.log(toEvent);
        if (!error) {
            if (typeof cares === 'function') {
                cares(null, accumulation);
            } else if (cares instanceof EventEmitter) {
                cares.emit(toEvent, accumulation);
            }
        } else {
            if (typeof cares === 'function') {
                cares(error, accumulation);
            } else if (cares instanceof EventEmitter) {
                cares.emit('error', error, accumulation);
            }
        }
    };
    
exports.flush = function (event, accumulator) {
    var flushEvent = event || 'data',
        flushAccumulator; 
    
    if (typeof flushEvent === 'string'
     && typeof accumulator === 'function'
    ) {
        flushAccumulator = accumulator;
    } else if (typeof flushEvent === 'function') {
        flushAccumulator = event;
        flushEvent = 'data';
    } else {
        flushEvent = 'data';
    }
    
    return {
        from : function (event /*,sourceEmitter || callback, ...*/) {
            var endEvent = typeof event === 'string' ? event : 'end',
                emptyFrom = slice(arguments, typeof event === 'string' ? 1 : 0);

            return {
                to : function (event /*, destinationEmitter || callback, ...*/) {
                    var toEvent = typeof event === 'string' ? event : 'end',
                        emitTo = slice(arguments, typeof event === 'string' ? 1 : 0);
                    
                    emptyFrom.forEach(function (emptyMe) {
                        var accumulation        = null,
                            _flushAccumulator    = flushAccumulator ?
                                //TODO need isBuffer check
                                function (chunk) {
                                    accumulation += flushAccumulator.apply(this, arguments);
                                } :
                                function (chunk) {
//                                        Buffer.isBuffer(chunk) ? 
                                    accumulation += chunk;
                                };
                                
                        if (emptyMe instanceof EventEmitter) {
                            emptyMe.
                                on(flushEvent, _flushAccumulator).
                                on(endEvent, function () {
                                    emitTo.forEach(tell.bind(null, toEvent, accumulation, null));
                                }).
                                on('error', function (ex) {
                                    emitTo.forEach(tell.bind(null, toEvent, accumulation, ex));
                                }
                            );
                        } else if (typeof emptyMe === 'function') {
                            try {
                                accumulation = emptyMe();
                                emitTo.forEach(tell.bind(null, toEvent, accumulation, null));
                            } catch (ex) {
                                emitTo.forEach(tell.bind(null, toEvent, accumulation, ex))
                            }
                        }
                    });
                }
            };
        }
    };
};

