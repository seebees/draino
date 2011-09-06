var util = require('util'),
    Stream          = require('stream').Stream,
    libs            = require('./libs.js'),
    slice           = libs.slice,
    inherit         = libs.inherit,
    mixin           = libs.mixin,
    StreamBuffer    = require('./streambuffer.js').StreamBuffer,
    BufferedStream  = require('./streambuffer.js').BufferedStream,
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

             //helper function to pull the next source or end the dest
            function nextOrEnd() {
                var next = dest._buffer.shift();
                dest._pipeCount -= 1;

                if (typeof next === 'function') {
                    next(true);
                } else if (dest._pipeCount <= 0) {
                    dest.end();
                } else {
                    nextOrEnd();
                }
            }

            //flush should result in ONLY one data event to the dest stream
            //so all source streams are buffered.
            var buff = new StreamBuffer(dest, source);

            //helper function to do the work for this source
            //this way flush and funnel can share the same buffer
            function next (fromEndOrNext) {
                if (buff.hasEnded()) {
                    //This is a HACK.  There has got to be a better way.
                    //The issue is that if you go through endOrNext and the
                    //source hasEnded, then you will go back through endOrNext,
                    //decrementing the pipeCount twice for one pipe.
                    if (fromEndOrNext) {
                        dest._pipeCount += 1;
                    }
                    buff.
                        //I need to nextOrEnd on end because the drain
                        //may fill the dest Stream.  If so, the StreamBuffer
                        //will not emit end until it gets a drain event from
                        //source
                        on('end', nextOrEnd).
                        drain();
                } else {
                    //This is the active buffer, once it is full, drain it.
                    dest._pipeCount += 1;
                    buff.on('full', next);
                }
            }

            //push onto the stack to process
            dest._buffer.push(next);

            if (!options.serial) {
                //once it's full move it to the top of the stack
                buff.on('full', function () {
                    var i = dest._buffer.indexOf(next);
                    if (i >= 0) {
                        dest._buffer.unshift(
                            dest._buffer.splice(i,1).shift()
                        );
                    }
                });
            }

            if (dest._pipeCount === 1) {
                //this is the first, just start it
                buff.on('full', nextOrEnd);
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
            //if you really don't want to buffer something you need to tell me.
            options.buffer      = (options.buffer === false ? false : true);

            //helper function to pull the next source or end the dest
            function nextOrEnd () {
                var next   = dest._buffer.shift();
                dest._pipeCount -= 1;

                if (typeof next === 'function') {
                    next();
                } else if (dest._pipeCount <= 0) {
                    dest.end();
                }
            }

            //helper function to do the work for this source
            //this way flush and funnel can share the same buffer
           function next () {
                if (source instanceof StreamBuffer) {
                    if (source.hasEnded()) {
                        source.
                            //I need to nextOrEnd on end because the drain
                            //may fill the dest Stream.  If so, the StreamBuffer
                            //will not emit end until it gets a drain event from
                            //source
                            on('end', nextOrEnd).
                            drain();
                    } else {
                        source.drain().
                            //The StreamBuffer returns the underlying source
                            //on drain.  So when that ends, go to the next
                            //(using once so I don't have dangling closures)
                            once('end', nextOrEnd);
                    }
                } else if (source instanceof Stream) {
                    //simple case (using once so I don't have dangling closures)
                    source.once('end', nextOrEnd);
                    source.pipe(dest, {end : false});
                    source.resume();
                } else {
                    nextOrEnd();
                }
            }

            if (dest._pipeCount === 1) {
                //this is the first, just start it
                //(using once so I don't have dangling closures)
                source.once('end', nextOrEnd);
                source.pipe(dest, {end : false});
                return dest;
            } else {
                if (options.buffer) {
                    //buffer the source
                    source = new StreamBuffer(dest, source, {end : false});
                    if (!options.serial) {
                        //once it's full move it to the top of the stack
                        source.on('full', function () {
                            var i = dest._buffer.indexOf(next);
                            if (i > 0) {
                                dest._buffer.unshift(
                                    dest._buffer.splice(i, 1).shift()
                                );
                            }
                        });
                    }
                } else {
                    //no buffering, we are not ready for you yet.
                    source.pause();
                }
            }
            //push onto the stack to process
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
    BufferedStream  : BufferedStream,
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
