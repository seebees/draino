var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    /**
     * merge the properties of 2 objects
     */
    mixin = function (target, source) {
        Object.keys(source).forEach(function (key) {
            target[key] = source[key];
        });
        
        return target;
    },
    /**
     * shorthand for
     * Array.prototype.slice.call(object, ...)
     */
    slice = (function (slice) {
        return function (object) {
            return slice.apply(object, slice.call(arguments, 1));
        };
    }([].slice)),
    /**
     * A helper function to tell the world we are done flushing
     */
    tell = function (toEvent, data, error, cares) {
        
        //tell whoever cares
        (!error                                  ?
            typeof cares === 'function'     ?
            cares(null, data)       :
            cares.emit(toEvent, data)            :
            typeof cares === 'function'     ?
            cares(error, data)      :
            cares.emit('error', error, data));
    },
    /**
     * the main working function for flush
     * flush().from().to() curry parameters into flushEngine
     */
    flushEngine = function (
        flushEvent,         //the event to flush e.g. 'data'
        flushAccumulator,   //custom accumulator function (optional)
        endEvent,           //the event that tells me I'm done flushing
        tellEvent,          //the event to notify with the accumulation
        listening,          //things waiting for accumulation
        toEmpty             //the source of data
    ) {
        //strings are faster to accumulate with +=, but we don't know if we
        //have a buffer or a string at this point.  So we push to an array,
        //this way we can have only one isBuffer check at the end in tell()
        var accumulation         = [],
            //if we were passed an accumulator, use it
            _flushAccumulator    = typeof flushAccumulator === 'function' ?
                function () {
                    accumulation.push(flushAccumulator.apply(this, arguments));
                } :
                function (chunk) {
                    accumulation.push(chunk);
                },
            //wrapper for tell, the issue here is an end event that passes a value
            _tell                = function (error) {
                listening.forEach(
                    tell.bind(
                        null, 
                        tellEvent, 
                        typeof accumulation[0] === 'string' ? 
                              accumulation.join('') :
                              accumulation, 
                        error
                    )
                );
                accumulation = [];
            };
                
//        console.dir({
//            'flushEvent'       : flushEvent,         //the event to flush e.g. 'data'
//            'flushAccumulator' : flushAccumulator,   //custom accumulator function (optional)
//            'endEvent'         : endEvent,           //the event that tells me I'm done flushing e.g. 'end'
//            'tellEvent'        : tellEvent,          //the event to notify with the accumulation e.g. 'success'
//            'listening'        : listening,          //things waiting for accumulation
//            'toEmpty'          : toEmpty             //things needing to be flushed
//        })
        
        //empty the "stream" and tell whoever cares
        if (toEmpty instanceof EventEmitter) {
            toEmpty.
                on(flushEvent, _flushAccumulator).
                on(endEvent, _tell).
                on('error', _tell);
        } else if (typeof toEmpty === 'function') {
            try {
                _flushAccumulator(toEmpty());
                process.nextTick(_tell);
            } catch (ex) {
                process.nextTick(_tell.bind(null, ex));
            }
        } else if (Array.isArray(toEmpty)) {
            //passed an array? lets flush it
            toEmpty.forEach(
                flushEngine.bind(
                    null, 
                    dataEvent,
                    dataAction,
                    endEvent,
                    tellEvent,
                    listening
                )
            );
        }
    },
        }
    },
    /**
     * the function to define our object (the things we are going to flush to)
     */
    to = function (
        flushEvent,         //curried from flush
        flushAccumulator,   //curried from flush
        endEvent,           //curried from "from"
        emptyFrom,          //curried from "from"
        event /*, destinationEmitter || callback, ...*/
    ) {
        
        var tellEvent = typeof event === 'string' ? event : 'success',
            waiting = slice(arguments, typeof event === 'string' ? 5 : 4),
            self = this instanceof EventEmitter ? this : new EventEmitter();
        
        if (waiting.length === 1 && Array.isArray(waiting[0])) {
            //if someone just passed an array, don't make then use .apply(
            waiting = waiting[0];
        }
        
        //we now know everything, pass it to the engine
        emptyFrom.forEach(
            engine.bind(
                null, 
                flushAccumulator,
                flushEvent,
                endEvent,
                tellEvent,
                waiting
            )
        );
        
        //remove the helper functions to avoid strange situations (hopefully)
        delete self.from;
        delete self.to;
        delete self.toMe;
        
        //chain on
        return self;
    },
    /**
     * syntactic sugar for self.to(event, self)
     */
    toMe = function (
        flushEvent,         //curried from flush
        flushAccumulator,   //curried from flush
        endEvent,           //curried from "from"
        emptyFrom,          //curried from "from"
        event
    ) {
        
        var tellEvent = typeof event === 'string' ? event : 'success',
            self = this instanceof EventEmitter ? this : new EventEmitter();

        //now we know everything, let to() do the work
        return to.call(
            self,
            flushEvent,
            flushAccumulator,
            endEvent,
            emptyFrom,
            tellEvent,
            self
        );
    },
    /**
     * function to define our subject (the things from whence we will flush)
     */
    from = function (
        flushEvent,       //curried from flush
        flushAccumulator, //curried from flush
        event /*,sourceEmitter || callback, ...*/
    ) {
        var endEvent = typeof event === 'string' ? event : 'end',
            emptyFrom = slice(arguments, typeof event === 'string' ? 3 : 2),
            self = this instanceof EventEmitter ? this : new EventEmitter();
        
        if (!emptyFrom.length) {
            //if I have nothing to empty, I can at least empty myself
            emptyFrom[0] = self;
        } else if (emptyFrom.length === 1 && Array.isArray(emptyFrom[0])) {
            //if someone just passed an array, don't make then use .apply(
            emptyFrom = emptyFrom[0];
        }
        
        //TODO how to append multiple from's e.g. this.flush().from().from().from().to();
        //bind the additional information an let the user call to() when they are ready
        return mixin(self, {
            'to'    : to.bind(self, flushEvent, flushAccumulator, endEvent, emptyFrom),
            'toMe'  : toMe.bind(self, flushEvent, flushAccumulator, endEvent, emptyFrom)
        });
    },
    /**
     * primary entry point
     * The function to define our verb (the event and how we wish to accumulate)
     */
    flush = function (event, accumulator) {
        var flushEvent = typeof event === 'string' ? event : 'data',
            flushAccumulator = 
                typeof accumulator === 'function' ?
                    accumulator : 
                    typeof event === 'function' ?
                        event : null,
            self = this instanceof EventEmitter ? this : new EventEmitter(); 
        
        //decorate the emitter and bind what we know
        return mixin(self, {
            'flush' : flush,
            'from'  : from.bind(self, flushEvent, flushAccumulator),
            'to'    : to.bind(self, flushEvent, flushAccumulator, 'end', [self]),
            'toMe'  : toMe.bind(self, flushEvent, flushAccumulator, 'end', [self])
        });
    };

//Expose
mixin(exports, {
    /**
     * Primary entry point
     * if the first parameter is an EventEmitter, I will decorate it
     * otherwise I'm looking for a String that will be the flush event
     * and an optional function to accumulate (if you want to do something
     * more complicated then pushing chunk onto an array)
     */
    'flush' : function (eventEmitter, event, accumulator) {
        if (eventEmitter instanceof EventEmitter) {
            return flush.call(eventEmitter, event, accumulator);
        } else {
            return flush(eventEmitter, event);
        }
    },
    /**
     * a function to decorate EventEmitter
     */
    'shine' : function (
        /*emitter, emitter, ...*/
    ) {
        slice(arguments).forEach(function (me) {
            if (me instanceof EventEmitter) {
                me.flush = flush;
            }
        });
    },
    /**
     * a function to add flush to EventEmitter.prototype
     */
    'shineAllEventEmitters' : function () {
        EventEmitter.prototype.flush = flush;
    }
});


