var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Stream = require('stream').Stream,
    prepareToEmpty = require('./empty.js').prepareToEmpty,
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
     * primary entry point
     * The function to define our verb (the event and or source of events)
     */
    empty = function (event) {
        var self = prepareToEmpty(event, this, true)
        
        //decorate the emitter in case you want to do it again
        self.empty = empty;
        return self;
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
/**
 * Primary entry point
 * if the first parameter is an EventEmitter, I will decorate it
 * otherwise I'm looking for a String that will be the flush event
 * and an optional function to accumulate (if you want to do something
 * more complicated then pushing chunk onto an array)
 */
exports.empty = function (event, eventEmitter) {
    if (eventEmitter instanceof EventEmitter) {
        return empty.call(eventEmitter, event);
    } else if (event instanceof EventEmitter) {
        return empty.call(event);
    } else {
        return  prepareToEmpty(event);
    }
};

    
/**
 * a function to decorate EventEmitter
 */
exports.shine = function (/*emitter, emitter, ...*/) {
    slice(arguments).forEach(function (me) {
        if (me instanceof EventEmitter) {
            me.empty = empty;
        } else if (Array.isArray(me)) {
            exports.shine.apply(null, me);
        }
    });
};
/**
 * a function to decorate your EventEmitter.prototype
 */
exports.shinePrototype = function (/*EmitterClass, EmitterClass, ...*/) {
    var toShine = slice(arguments);
    if (toShine.length) {
        toShine.forEach(function (me) {
            if (EventEmitter.prototype.isPrototypeOf(me.prototype)) {
                me.prototype.empty = empty;
            } else if (me instanceof EventEmitter) {
                //TODO Shine this emitters prototype
            } else if (Array.isArray(me)) {
                exports.shinePrototype.apply(null, me);
            }
        });
    } else {
        EventEmitter.prototype.empty = empty;
    }
};






/*
empty(event/source).
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
    
prime(event).
    with(fn, arg, arg,...).  //if last arg === function I use it as callback || [[ fn, arg, arg], [fn, arg, arg, arg]]
    intoEvent(customEach???).
    isDry(event, fn).
    onEach(event).
    onDone(event).
    to(target);
    
*/