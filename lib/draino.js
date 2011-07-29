var util = require('util'),
    Stream          = require('stream').Stream,
    libs            = require('./libs.js'),
    slice           = libs.slice,
    inherit         = libs.inherit,
    mixin           = libs.mixin,
    StreamBuffer    = require('./streambuffer.js').StreamBuffer,
    actions         = {
        flush   : function (source, options) {
            var dest = this;
            
            //we need a buffer to hold the outstanding streams
            if (!Array.isArray(dest._buffer)) {
                dest._buffer = [];
            }
            dest._pipeCount  = dest._pipeCount || 0;
            dest._pipeCount += 1;
            
            options             = options || {};
            
            /**
             *hellper function to pull the next source Stream or end dest Stream
             */
            function nextOrEnd() {
                var next = dest._buffer.shift();
                dest._pipeCount -= 1;
                
                if (typeof next === 'function') {
                    next();
                } else if (dest._pipeCount <= 0) {
                    dest.end();
                }
            }
            
            var buff = new StreamBuffer(source, dest, {end : false});
            function next () {
                if (buff.hasEnded()) {
                    buff.
                        once('end', nextOrEnd).
                        drain();
                } else {
                    dest._buffer.unshift(next);
                    dest._pipeCount += 1;
                }
            }
            dest._buffer.push(next);
            
            if (dest._pipeCount === 1) {
                buff.once('full', nextOrEnd);
            } else if (!options.serial) {
                buff.once('full', function () {
                    var i = dest._buffer.indexOf(next);
                    if (i >= 0) {
                        dest._buffer.shift(
                            dest._buffer.splice(i,1).shift()
                        );
                    }
                });
            }
            
            return dest;
        },
        funnel      : function (source, options) {
            var dest = this;
            
            //initial conditions/
            if (!Array.isArray(dest._buffer)) {
                dest._buffer = [];
            }
            dest._pipeCount     = dest._pipeCount || 0;
            dest._pipeCount    += 1;
            
            options             = options || {};
            options.buffer      = (options.buffer === false ? false : true);
            
            function nextOrEnd () {
                var startNext   = dest._buffer.shift();
                dest._pipeCount -= 1;
                
                if (typeof startNext === 'function') {
                    startNext();
                } else if (dest._pipeCount <= 0) {
                    dest.end();
                }
            }
            
           function next () {
                if (source instanceof StreamBuffer) {
                    if (source.hasEnded()) {
                        source.once('end', nextOrEnd).
                            drain();
                    } else {
                        source.drain().
                            once('end', nextOrEnd);
                    }
                } else if (source instanceof Stream) {
                    source.once('end', nextOrEnd);
                    source.pipe(dest, {end : false});
                    source.resume();
                } else {
                    nextOrEnd();
                }
            }
            
            if (dest._pipeCount === 1) {
                source.once('end', nextOrEnd);
                source.pipe(dest, {end : false});
                return dest;
            } else {
                if (options.buffer) {
                    source = new StreamBuffer(source, dest, {end : false});
                    if (!options.serial) {
                        source.once('full', function () {
                            var i = dest._buffer.indexOf(next);
                            if (i > 0) {
                                dest._buffer.unshift(
                                    dest._buffer.splice(i,1).shift()
                                );
                            }
                        });
                    }
                } else {
                    source.pause();
                }
            }
            
            dest._buffer.push(next);
            return dest;
        }
    },
    SerialPump      = inherit(
        Stream,
        actions
    );
    
SerialPump.prototype.end = function () {
    this.emit('end');
};

mixin(exports, {
    SerialPump      : SerialPump,
    StreamBuffer    : StreamBuffer,
    flush           : function (source, dest, options) {
        return actions.flush.call(dest, source, options);
    },
    funnel          : function (source, dest, options) {
        return actions.funnel.call(dest, source, options);
    },
    shine           : function (/*emitter, emitter, ...*/) {
        slice(arguments).forEach(function (me) {
            if (       me instanceof Stream) {
                //me.empty = empty;
            } else if (Array.isArray(me)) {
                exports.shine.apply(null, me);
            } else if (me.prototype
                    && Stream.prototype.isPrototypeOf(me.prototype)) {
                mixin(me.prototype, actions);
            }
        });
    }
});
