var assert          = require('assert'),
    util            = require('util'),
    Stream          = require('stream').Stream,
    vows            = require('vows');
    draino          = require('draino'),
    SimpleWrite     = function (num) {
        var writeCount = 0;
        this.writable = true;
        this.tmp = '';
        this.startTime = new Date();
        
        this.write = function(chunk) {
            //console.log(chunk);
            if (!num || writeCount < num) {
                writeCount += 1;
                this.tmp += chunk;
                return true;
            } else {
                 writeCount += 1;
                this.tmp += chunk;
                return false;
            }
        };
        this.end = function () {
            this.stopTime = new Date();
            this.emit('success', this.tmp);
        };
    },
    SimpleRead      = function (chunks, delay) {
        var self = this,
            i = 0;
        
        delay = delay || 1;
        Stream.call(self);
        
        function next () {
            self.pending = setTimeout(function () {
                    if (chunks.length > i) {
                        //console.log(chunks[i]);
                        self.emit('data', chunks[i]);
                        next();
                    } else {
                        //console.dir(self);
                        self.hasEnded = true;
                        self.emit('end');
                    }
                    i += 1;
                }, delay
            );
        }
        next();
        
        self.chunks = chunks;
        self.pause  = function () {
            if (self.pending) {
                self.paused = true;
                clearTimeout(self.pending);
                delete self.pending;
            }
        };
        
        self.resume = function () {
            self.paused = false;
            next();
        };
        
    },
    ShinnyEmitter = function () {
        EventEmitter.call(self);
    };
    
util.inherits(SimpleWrite, Stream);
util.inherits(SimpleRead, Stream);
util.inherits(ShinnyEmitter, process.EventEmitter);

vows.describe('StreamBuffer').addBatch(
{
    'the basic test objects' : {
        topic : function () {
            var read  = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            var write = new SimpleWrite();
            read.pipe(write);
            return write;
        },
        'will pipe data' : function (data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, ' A1  A2  A3 ');
        }
    },
    'new StreamBuffer(ReadStream, WriteStream)' : {
        topic : function () {
            this.read    = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            this.write   = new SimpleWrite();
            
            this.sb = new draino.StreamBuffer(this.write, this.read);
            
            var self = this;
            
            this.sb.on('full', function () {
                self.callback(null, self.sb);
            }); 
        },
        'will emit full when source has ended' : function (error, sb) {
            assert.ok(sb.source().hasEnded);
        },
        'will identify that the source has ended' : function (error, sb) {
            assert.ok(sb.hasEnded());
        },
        '.read() will return all the data in the buffer' : function (error, sb) {
            assert.strictEqual(sb.read(), ' A1  A2  A3 ');
        },
        '.drain()' : {
            topic : function (sb) {
                this.callback(null, sb.drain());
            },
            'will write the data to the write stream' : function () {
                assert.strictEqual(this.write.tmp, ' A1  A2  A3 ');
            },
            'will return the original source passed to StreamBuffer' : function (error, source) {
                assert.strictEqual(source, this.read);
            }
        }
    },
    'new StreamBuffer(Read, Write, {size:})' : {
        topic : function () {
            this.read    = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            this.write   = new SimpleWrite();
            
            this.sb = new draino.StreamBuffer(this.write, this.read, {size:3});
            
            var self = this;
            
            this.sb.once('full', function () {
                self.callback(null, self.sb);
            }); 
        },
        'will pause the source once the buffer is full' : function (error, sb) {
            assert.ok(sb.source().paused);
        },
        'will emit full after it has read: size' : function (error, sb) {
            assert.strictEqual(sb.read(), ' A1 ');
        },
        ' then .drain()' : {
            topic : function (sb) {
                sb.drain();
                return this.write;
            },
            'will drain the buffer into WriteStream, resume the ReadStream and remove itself' : function (data) {
                assert.strictEqual(data, ' A1  A2  A3 ');   
            }
        }
    },
    'new StreamBuffer(WriteStream)' : {
        topic : function () {
            this.read    = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            this.write   = new SimpleWrite();
            
            this.sb = new draino.StreamBuffer(this.write);
            
            this.read.pipe(this.write, {end:false});
            
            var self = this;
            
            this.read.once('end', function () {
                self.callback(null, self.sb);
            }); 
        },
        'will buffer arbitrary writes to the WriteStream' : function (error, sb) {
            assert.strictEqual(sb.dest().tmp, '');
            assert.strictEqual(sb.read(), ' A1  A2  A3 ');
        },
        '.drain()' : {
            topic : function(sb) {
                sb.drain();
                this.write.write('OMFG');
                this.callback(null, this.write);
            },
            'will write the buffer to the WriteStream and remove itself' : function (error, writeStream) {
                assert.strictEqual(writeStream.tmp, ' A1  A2  A3 OMFG');
            },
            'will not emit end to the writeStream' : function (error, writeStream) {
                assert.ok(!writeStream.hasEnded);
            }
        }
    }
}).export(module);
