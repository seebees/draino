var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Stream = require('stream').Stream,
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
     * 
     */
    newOp = function() {
        var options = {},
            op = {}
            setOption = function(name, data) {
                if (data) {
                    if (options.hasOwnProperty(name)) {
                        if (Array.isArray(options.name)) {
                            if (Array.isArray(data)) {
                                options[name] = options[name].concat.apply(options[name], data);
                            } else {
                                options[name].push(data)
                            }
                        } else {
                            options[name] = [options[name], data];
                        }
                    } else {
                        options[name] = data;
                    }
                }
                return op;
            };
            
        [
             'source', 'self',
             'from', 'to', 
             'isDry', 
             'onAccumulate', 'onEach', 'onDone', 
             'with', 'intoEvent',
             'engine'
         ].forEach(function (setter) {
             op[setter] = setOption.bind(options, setter);
         });
        op.getSelf = function () {
            return options.self || options.self = new EventEmitter();
        };
        op.run = function () {
            if (typeof options.engine === 'function') {
                options.engine(options);
            }
        };
        
        return op;
    },
    /**
     * A helper function to tell the world we are done flushing
     */
    tell = function (toEvent, data, error, cares) {
        //TODO better type checking (cares instanceof EventEmitter)
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
    flushEngine = (function() {
        /**
         * the working function
         */
        var flush = function (op, toEmpty) {
            //strings are faster to accumulate with +=, but we don't know if we
            //have a buffer or a string at this point.  So we push to an array,
            //this way we can have only one isBuffer check at the end in tell()
            var accumulation         = [],
                //if we were passed an accumulator, use it
                _flushAccumulator    = typeof op.onAccumulate === 'function' ?
                    function () {
                        accumulation.push(op.onAccumulate.apply(this, arguments));
                    } :
                    function (chunk) {
                        accumulation.push(chunk);
                    },
                //wrapper for tell, the issue here is an end event that passes a value
                _tell                = function (error) {
                    op.to.forEach(
                        tell.bind(
                            null, 
                            op.onEach, 
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
                    on(op.source, _flushAccumulator).
                    on(op.isDry, _tell).
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
                toEmpty.forEach(flushEngine.bind(op));
            }
        };
        
        /**
         * Setting defaults and how to call the working function
         */
        return function (op) {
            //lets make sure our default options are set
            op.source   = op.source || 'data';
            op.from     = op.from   || [op.self];
            op.isDry    = op.isDry  || 'end';
            op.onEach   = op.onEach || 'success';
            op.to       = op.to     || [op.self];
            
            op.from.forEach(flush.bind(null, op));
        };
    }()),
    /**
     * the main working function for pump
     * pump().from().to() curry parameters into pumpEngien
     */
    pumpEngine = function (
//        dataEvent,          //curried from flush | pump | prime
//        beforePipe,         //curried from flush | pump | prime
//        endEvent,           //curried from "from"
        sourceStreams,       //curried from "from"
        tellEvent,           //curried from "to"
        targetStreams        //curried from "to"
    ) {
            
//    console.dir({
//        'flushEvent'       : flushEvent,         //the event to flush e.g. 'data'
//        'flushAccumulator' : flushAccumulator,   //custom accumulator function (optional)
//        'endEvent'         : endEvent,           //the event that tells me I'm done flushing e.g. 'end'
//        'tellEvent'        : tellEvent,          //the event to notify with the accumulation e.g. 'success'
//        'listening'        : listening,          //things waiting for accumulation
//        'toEmpty'          : toEmpty             //things needing to be flushed
//    })
        
        
        
        
        sourceStreams.forEach(function (toPipe) {
            if (toPipe instanceof Stream) {
                toPipe.
                    on('end', function () {
                        var nextStream = sourceStream.shift();
                        if (nextStream instanceof Stream) {
                            beforePipe(nextStream);
                            nextStream.resume();
                        }
                    }).
                    on('error', function (ex) {
                        //TODO how to notifiy?
                        pipeMe();
                    });
                
                targetStream.forEach(toPipe.pipe.bind(toPipe));
                toPipe.pause();
            }
        });
        
        (function pipeMe (toPipe) {
            //pipe the "stream" and tell whoever cares
            //before Pipe is either an event to tell or a callback to call
            beforePipe(null, toPipe);
            if (toPipe instanceof Stream) {
                toPipe.
                    on('end', function () {
                        pipeMe();
                    }).
                    on('error', function (ex) {
                        //TODO how to notifiy?
                        pipeMe();
                    });
                
                destinationStream.forEach(serialPipe.stream.bind(null, toPipe));
                //TODO Stream.pipe will not work because it ends the 
                //     destination when the source ends
                
            } 
//            else if (typeof toEmpty === 'function') {
//                try {
//                    _flushAccumulator(toEmpty());
//                    process.nextTick(function () {
//                        listening.forEach(tell.bind(null, tellEvent, accumulation, null));
//                        accumulation = [];
//                    });
//                } catch (ex) {
//                    process.nextTick(function () {
//                        listening.forEach(tell.bind(null, tellEvent, accumulation, ex));
//                        accumulation = [];
//                    });
//                }
//            } else if (Array.isArray(toEmpty)) {
//                //TODO nested accumulation?
//            }
        }())
    },
    /**
     * the function to define our object (the things we are going to flush to)
     */
    to = function (op/*, targetEmitters || callbacks, ...*/) {
        
        var listening = slice(arguments, 1),
            self = this instanceof EventEmitter ? this : op.getSelf();
        
        if (listening.length === 1 && Array.isArray(listening[0])) {
            //if someone just passed an array, don't make then use .apply(
            listening = listening[0];
        }
        
        //we now know everything, run it!
        op.to(listening).run();
        
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
    toMe = function (op, event) {
        var onEach = typeof event === 'string' ? event : 'success',
            self = this instanceof EventEmitter ? this : op.getSelf();
        
        //now we know everything, let to() do the work
        return to.call(
            self,
            op.onEach(onEach),
            self
        );
    },
    /**
     * function to define our subject (the things from whence we will flush)
     */
    from = function (op/*,sourceEmitters || callbacks, ...*/) {
        var self = this instanceof EventEmitter ? this : op.getSelf();
        
        op.from(slice(arguments, 1));
        
        return self;
    },
    /**
     * 
     */
    isDry = function(op, event) {
        var dryEvent = typeof event === 'string' ? event : 'end',
            self = this instanceof EventEmitter ? this : op.getSelf();
        
        op.isDry(dryEvent);
        
        return self;
    },
    /**
     * 
     */
    onAccumulate = function(op, fn) {
        var willAccumulate = typeof fn === 'function' ? fn : false,
            self = this instanceof EventEmitter ? this : op.getSelf();
        
        op.onAccumulate(willAccumulate);
        
        return self;
    },
    /**
     * 
     */
    onEach = function(op, event) {
        var eachEvent = typeof event === 'string' ? event : 'end',
            self = this instanceof EventEmitter ? this : op.getSelf();
        
        op.onEach(eachEvent);
        
        return self;
    },
    /**
     * 
     */
    onDone = function(op, event) {
        var doneEvent = typeof event === 'string' ? event : 'end',
            self = this instanceof EventEmitter ? this : op.getSelf();
        
        op.onDone(doneEvent);
        
        return self;
    },
    
    /**
     * primary entry point
     * The function to define our verb (the event and or source of events)
     */
    flush = function (event) {
        var flushEvent = typeof event === 'string' ? event : 'data',
            self = this instanceof EventEmitter ? this : new EventEmitter(),
            op = newOp().self(self).source(flushEvent).engine(flushEngine);
        
        //decorate the emitter and bind what we know
        return mixin(self, {
            'flush' : flush,
            'from'  : from.bind(self, op),
            'isDry'  : isDry.bind(self, op),
            'onEach'  : onEach.bind(self, op),
            'onDone' : onDone.bind(self, op),
            'onAccumulate' : onAccumulate.bind(self, op),
            'to'    : to.bind(self, op),
            'toMe'  : toMe.bind(self, op)
        });
    };
    
    //TODO pump: easy way to pipe a series of streams
    /**
     * pump(function(){//do something before each stream is piped}).from(//same).to(//same)
     */
    //TODO prime: a way to kick of pump from a callback
    /**
     * prime(function(){//the callback to handle a bunch of requests}).from(//curried functions waiting for a callback).to(//same)
     */

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






/*
flush(event/source).
    from(source).
    isDry(event).       'end'
    onAccumulate(fn).   +=
    onEach(event/fn).   'successs'
    onDone(event/fn).   'end'
    to(target);
    
pump(event/source).
    from(source).
    isDry(event).
    onEach(event/fn).
    onDone(event/fn).
    to(target);
    
prime(fn.curry).
    with(fn).
    intoEvent(fn, arg, arg, ...).
    isDry(event, fn).
    onDone(event).
    to(target);
    
*/