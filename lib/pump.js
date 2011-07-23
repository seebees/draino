var util            = require('util'),
    EventEmitter    = require('events').EventEmitter,
    Stream          = require('stream').Stream
    options         = require('./options.js');
    newOp           = options.newOp,
    tell            = options.tell,
    inherit         = options.inherit,
    mixin           = options.mixin,
    /**
     *
     *
     */
    BufferStream    = inherit(
        Stream,
        function (from, to, size) {
            if (!(from instanceof Stream)
             && !(to   instanceof Stream)
            ) {
                //throw type error
                console.log('bad');
            }
            
            Stream.call(this);
            var buffer      = [],
                total       = 0,
                hasEnded    = false,
                self        = this;
            
            mixin(self, {
                write : function (chunk) {
                    buffer.push(chunk);
                    if (size) {
                        total += chunk.length;
                        if (total > size) {
                            from.pause();
                        }
                    }
                },
                drain : function() {
                    var chunk = buffer.shift();
                    while (chunk && to.write(chunk)) {
                        chunk = buffer.shift();
                    }
                    //TODO this is not exact.  if chunk = ''? and their other chunks
                    if (chunk) {
                        buffer.unshift(chunk);
                    } else {
                        if (hasEnded) {
                            to.emit('end');
                        } else {
                            console.dir(to);
                            from.pipe(to);
                            console.dir(from);
                        }
                        
                        if (size && total > size) {
                            from.resume();
                        }
                        
                        //cleanup
                        from.removeListener('end', self.drain);
                        self.emit('end');
                    }
                },
                end     : function () {
                    hasEnded = true;
                },
                close   : function () {
                    hasEnded = true;
                },
                writable : true0
            });
            
            from.pipe(self);
            to.on('drain', self.drain);
        }
    ),
    SerializeStreams = inherit(
        Stream,
        function (op) {
            var self = this;
            
            self.buffers = [];
            self.add(op.from);
            
            mixin(self, op);
            
            if (typeof self.to.write === 'function') {
                self.write   = function write (chunk) {
                    self.to.write(chunk);
                };
            } else if (typeof self.to === 'function') {
                self.write   = function write (chunk) {
                    op.to(chunk);
                };
            } else if (Array.isArray(self.to)) {
                self.write = (function () {
                    function write (to) {
                        if (typeof to.write === 'function') {
                            to.write(this);
                        } else if (typeof to === 'function') {
                            to(this);
                        } else if (Array.isArray(to)) {
                            to.forEach(write, this);
                        } else {
                            //throw type error
                        }
                    };
                        
                    return function (chunk) {
                        self.to.forEach(write, chunk);
                    };
                }());
            } else {
                //throw type error
            }
        }, {
            writable : true,
            end      : function () {
                var next = this.buffers.shift();
                
                if (next instanceof BufferStream) {
                    tell(this.onEach, next, null, this.to);
                    next.drain();
                } else if (!this.buffers.length) {
                    tell(this.onDone, null, null, this.to);
                } else {
                    this.end();
                }
            },
            add      : function (from) {
                if (Array.isArray(from)) {
                    from.forEach(function (from) {
                        this.buffers.push(new BufferStream(from, this));
                    });
                } else if (from instanceof Stream) {
                    //Just do pipe here
                    this.buffers.push(new BufferStream(from, this));
                }
            }
        }
    )
    /**
     * the Engine function for empty
     * Setting defaults and how to call the working function
     */
    pumpEngine = function (op) {
        //lets make sure our default options are set
        op.to       = op.to     || op.self;
        op.onDone   = op.onDone || 'success';
        op.onEach   = op.onEach || 'flush';
        op.buffers  = [];
        op._emptyCount = 0;
        
        new SerializeStreams().end();
    };
    
/**
 * 
 */
exports.prepareToPump = function (from, emitter, decorate) {
    var options = {};
    
    var set = newOp(options),
        op = set.op;
        
    set.emitter(emitter);
    op.to           = set.array.bind(op, 'to');
    op.from         = set.array.bind(op, 'from');
    op.onDone       = set.string.bind(op, 'onDone');
    op.onEach       = set.string.bind(op, 'onEach');
    options.engine  = pumpEngine;
    
    op.from(from);
    
    //TODO add cleanup option (if false do not disconnect listeners)
    op.toMe         = function (event) {
        op.onEach(event);
        op.to(options.self);
        return op.getSelf();
    };
    
    if (decorate) {
        set.decorate();
        return options.self;
    } else {
        return op;
    }
};
