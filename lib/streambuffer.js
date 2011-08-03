var util            = require('util'),
    Stream          = require('stream').Stream,
    SerialPump      = require('./draino.js').SerialPump,
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
        function (dest, source, options) {
            options = options || {};
            
            Stream.call(this);
            if (source) {
                source.pipe(this);
            }
            
            var buffer          = [],
                total           = 0,
                hasEnded        = false,
                self            = this;
                
            self.writable       = true;
            //TODO do I need to support an optional encoding param here?
            //If I do support encoding here then concatBuffers becomes a pain.
            self.write          = function (chunk) {
                if (typeof chunk !== 'undefined') {
                    buffer.push(chunk);
                    total += chunk.length;
                }
                if (total > options.size) {
                    source.pause();
                    self.emit('full');
                }
            };
            
            if (dest instanceof Stream && source instanceof Stream) {
                self.drain          = function (encoding) {
                    if (hasEnded) {
                        dest.emit('pipe', source);
                        if (total && dest.writable) {
                            if (false === dest.write(self.read(encoding))) {
                                dest.once('drain', function() {
                                    self.emit('end');
                                });
                            } else {
                                self.emit('end');
                            }
                        }
                    } else {
                        source.pipe(dest, options);
                        if (total && dest.writable) {
                            if (false === dest.write(self.read(encoding))) {
                                source.pause();
                            } else {
                                source.resume();
                            }
                        }
                    }
                    
                    //cleanup
                    self.emit('close');
                    self.destroy();
                    self.drain = function () {
                        self.destroy();
                    };
                    return source;
                };
            }
            
            //You want a buffer for yourself?  Ok.
            if (dest && (dest === source || !source)) {
                var oldWrite    = dest.write;
                    
                dest.write      = self.write;
                self.drain      = function (encoding) {
                    dest.write  = oldWrite;
                    dest.write(self.read(encoding));
                    self.destroy();
                }
            }
            
            self.read           = function (encoding) {
                if (total) {
                    var data = concatBuffers(buffer, total, encoding);
                    return data;
                } else {
                    return '';
                }
            }
            
            self.flush          = function () {
                buffer = [];
                total  = 0;
            };
            
            self.end            = function () {
                hasEnded = true;
                self.emit('full');
            };
            
            self.destroy        = function () {
                hasEnded = true;
                self.flush();
                self.removeAllListeners();
                if (oldWrite) {
                    dest.write = oldWrite;
                }
            };
            self.destroySoon    = function () {
                self.on('end', self.destroy);
                self.drain();
            }
            
            self.close          = function () {
                hasEnded = true;
            };
            
            self.hasEnded       = function () {
                return hasEnded;
            };
            
            self.source         = function () {
                return source;
            };
            
            self.dest           = function () {
                return dest;
            }
        }
    );