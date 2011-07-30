var util = require('util'),
    Stream          = require('stream').Stream,
    libs            = require('./libs.js'),
    slice           = libs.slice,
    inherit         = libs.inherit,
    mixin           = libs.mixin,
    StreamBuffer    = require('./streambuffer.js').StreamBuffer,
    snake           = require('./snake.js').snake,
    actions         = {
        flush   : function (source, options) {
            var dest = this;
            
            //we need a buffer to hold the outstanding streams
            if (!Array.isArray(dest._buffer)) {
                dest._buffer    = [];
            }
            //Stream::pipe already gives us a var for this, why make my own?
            dest._pipeCount     = dest._pipeCount || 0;
            dest._pipeCount     += 1;
            
            options             = options || {};
            
            
             //hellper function to pull the next source or end the dest
            function nextOrEnd() {
                var next = dest._buffer.shift();
                dest._pipeCount -= 1;
                
                if (typeof next === 'function') {
                    next();
                } else if (dest._pipeCount <= 0) {
                    dest.end();
                }
            }
            
            //flush should result in ONLY one data event to the dest stream
            //so all source streams are buffered.
            var buff = new StreamBuffer(dest, source, {end : false});
            
            //hellper function to do the work for this source
            //this way flush and funnel can share the same buffer
            function next () {
                if (buff.hasEnded()) {
                    buff.
                        once('end', nextOrEnd).
                        drain();
                } else {
                    //every time we go through nextOrEnd _pipeCount goes down
                    //for this Stream we are going to go to nextOrEnd
                    //when we are full AND when the Stream is drained
                    //There is probobly a better way to do this...
                    dest._pipeCount += 2;
                    buff.once('full', nextOrEnd);
                    dest._buffer.unshift(next);
                }
            }
            
            //push onto the stack to proccess
            dest._buffer.push(next);
            
            if (dest._pipeCount === 1) {
                //this is the first, just start it
                buff.once('full', nextOrEnd);
            } else if (!options.serial) {
                //once it's full move it to the top of the stack
                buff.once('full', function () {
                    var i = dest._buffer.indexOf(next);
                    if (i >= 0) {
                        dest._buffer.shift(
                            dest._buffer.splice(i,1).shift()
                        );
                    }
                });
            }
            
            //let's do that again!
            return dest;
        },
        funnel      : function (source, options) {
            var dest = this;
            
            //we need a buffer to hold the outstanding streams
            if (!Array.isArray(dest._buffer)) {
                dest._buffer = [];
            }
            //Stream::pipe already gives us a var for this, why make my own?
            dest._pipeCount     = dest._pipeCount || 0;
            dest._pipeCount    += 1;
            
            options             = options || {};
            //if you really don't want to buffer somthing you need to tell me.
            options.buffer      = (options.buffer === false ? false : true);
            
            //hellper function to pull the next source or end the dest
            function nextOrEnd () {
                var next   = dest._buffer.shift();
                dest._pipeCount -= 1;
                
                console.log(dest._pipeCount);
                if (typeof next === 'function') {
                    next();
                } else if (dest._pipeCount <= 0) {
                    dest.end();
                }
            }
            
            //hellper function to do the work for this source
            //this way flush and funnel can share the same buffer
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
                //this is the first, just start it
                source.once('end', nextOrEnd);
                source.pipe(dest, {end : false});
                return dest;
            } else {
                if (options.buffer) {
                    //buffer the source
                    source = new StreamBuffer(dest, source, {end : false});
                    if (!options.serial) {
                        //once it's full move it to the top of the stack
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
                    //no buffering, we are not ready for you yet.
                    source.pause();
                }
            }
            //push onto the stack to proccess
            dest._buffer.push(next);
            
            //let's do that again!
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
    snake           : snake,
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
