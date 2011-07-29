var util            = require('util'),
    Stream          = require('stream').Stream,
    pipe            = Stream.prototype.pipe,
    libs            = require('./libs.js'),
    tell            = libs.tell,
    inherit         = libs.inherit,
    mixin           = libs.mixin,
    concatBuffers   = function (buffers, totalSize, encoding) {
        //from node.js fs.js (thanks guys);
        var buffer;
        if (buffers[0] instanceof Buffer) {
            switch (buffers.length) {
            case 0: buffer = new Buffer(0); break;
            case 1: buffer = buffers[0]; break;
            default: // concat together
                buffer = new Buffer(totalSize);
                var n = 0;
                buffers.forEach(function (b) {
                    var l = b.length;
                    b.copy(buffer, n, 0, l);
                    n += l;
                });
                break;
            }
            if (encoding) {
                buffer = buffer.toString(encoding);
            }
            return buffer;
        } else if (typeof buffers[0] === 'string') {
            return buffers.join('');
        } else {
            TypeError('Not sure how to concat what you have given me');
        }
    },
    StreamBuffer    = exports.StreamBuffer = inherit(
        Stream,
        function (source, dest, options) {
            if (!(source instanceof Stream)
             && !(dest   instanceof Stream)
            ) {
                //throw type error
                console.log('bad');
            }
            
            options = options || {};
            
            Stream.call(this);
            source.pipe(this);
            
            var buffer          = [],
                total           = 0,
                hasEnded        = false,
                self            = this;
                
            self.writable       = true;
            //TODO do I need to support an optional encoding param here?
            self.write          = function (chunk) {
                buffer.push(chunk);
                total += chunk.length;
            };
            
            self.drain          = function (encodeing) {
                if (hasEnded) {
                    dest.emit('pipe', source);
                    if (buffer.length && dest.writable) {
                        if (false === dest.write(self.read())) {
                            dest.once('drain', function() {
                                self.emit('end');
                            });
                        } else {
                            self.emit('end');
                        }
                    }
                } else {
                    source.pipe(dest, options);
                    if (buffer.length && dest.writable) {
                        if (false === dest.write(self.read())) {
                            source.pause();
                        }
                    }
                }
                
                //cleanup
                self.emit('close');
                self.removeAllListeners('full');
                return source;
            };
            
            //You want a buffer for yourself?  Ok.
            if (source === dest || !dest) {
                var oldWrite    = dest.write,
                    oldDrain    = self.drain;
                
                dest = source;
                    
                dest.write      = self.write;
                self.drain      = function () {
                    dest.write = oldWrite;
                    dest.write(self.read());
                    self.distroy();
                }
            }
            
            self.read           = function (encodeing) {
                var data = concatBuffers(buffer, total, encodeing);
                buffer = [];
                return data;
            }
            
            self.end            = function () {
                hasEnded = true;
                self.emit('full');
            };
            
            //TODO need to pass on events if needed
            //TODO destroySoon()
            self.destroy        = function () {
                //TODO
                hasEnded = true;
            };
            
            self.close          = function () {
                hasEnded = true;
            };
            
            self.hasEnded       = function () {
                return hasEnded;
            };
        }
    );