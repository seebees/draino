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
            //console.error(chunk, writeCount, num);
            writeCount += 1;
            if (!num || writeCount < num) {
                this.tmp += chunk;
                return true;
            } else if (writeCount === num) {
                this.tmp += chunk;
                var self = this;
                // yes, I could use process.nextTick, but I want to
                // slow things down
                setTimeout(function () {
                    writeCount = 0;
                    self.emit('drain');
                }, 2);
                return false;
            } else {
                throw new Error('must wait for drain!');
            }
        };
        this.end = function () {
            this.stopTime = new Date();
            this.emit('success', this.tmp);
        };
    },
    SimpleRead      = function (chunks, delay) {
        var self  = this,
            i     = 0;

        delay = delay || 1;
        Stream.call(self);

        function next () {
            self.pending = setTimeout(function () {
                    if (chunks.length > i) {
                        //console.error(chunks[i], 'SimplRead');
                        //console.error(chunks[i+1], 'NextSimplRead');
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
        };
        next();

        self.chunks = chunks;
        self.pause  = function () {
            //console.error('paused');
            if (self.pending) {
                self.paused = true;
                clearTimeout(self.pending);
                delete self.pending;
            }
        };

        self.resume = function () {
            //console.error('resume');
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

            var self = this;
            write.on('success', function (data){
              self.callback(null, data);
            });
        },
        'will pipe data' : function (error, data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, ' A1  A2  A3 ');
        }
    },
    'ReadStream.pipe(new BufferedStream()).pipe(WriteStream)': {
      topic: function () {
        //These are here for comparison
        this.read = new Stream();
        this.write = new Stream();
        this.read.pipe(this.write);

        this.read2 = new Stream();
        this.read2.have = 'it';
        this.bs = new draino.BufferedStream();
        this.read2.pipe(this.bs);
        this.write2 = new Stream();
        this.write2.on('pipe', function (source) {
          this.source = source;
        });

        this.bs.pipe(this.write2);
        this.callback();
      },
      'is equivilant to ReadStream.pipe(WriteStream)': function () {
        var self = this;

        //all read events should exist and only have listeners for 1 stream
        assert.strictEqual(
            Object.keys(this.read2._events).length, 4);
        ['data', 'error'].forEach(function (event) {
          assert.strictEqual(self.read2._events[event].length, 1);
          assert.isFunction(self.read2._events[event][0]);
        });
        ['end', 'close'].forEach(function (event) {
          assert.strictEqual(self.read2._events[event].length, 2);
          assert.isFunction(self.read2._events[event][0]);
          assert.isFunction(self.read2._events[event][1]);
        });

        //all write events should exist and only have listeners for 1 stream
        assert.strictEqual(
            Object.keys(this.write2._events).length, 7);
        ['error', 'pause', 'resume',
         'end', 'close'].forEach(function (event) {
          assert.isFunction(self.write2._events[event]);
        });

        //drain is modified slightly becuase of drainMagic (see code)
        assert.strictEqual(self.write2._events.drain.length, 1);
        assert.isFunction(self.write2._events.drain[0]);

        //BufferedStream should have no listeners
        assert.strictEqual(
            Object.keys(this.bs._events).length, 0);

        //the 'pipe' event on write2 should have had a source of read2
        assert.strictEqual(this.write2.source, this.read2);
      },
      'events from the ReadStream' : {
        topic : function () {

          //set up the read stream
          this.read2.readable = true;
          this.read2.pause = function () {
            this.paused = true;
          };
          this.read2.resume = function () {
            this.resumed = true;
          };

          //set up the wite steam
          this.write2.writable = true;
          this.write2.write = function (chunk) {
            this.tmp = chunk;
            return false;
          };
          this.write2.end = function () {
            this.hasEnded = true;
          };

          //set up the BufferedStream to throw errors on everything
          this.bs.write = function () {
            throw Error('should not be called');
          };
          this.bs.end = function () {
            throw Error('should not be called');
          };
          this.bs.pause = function () {
            throw Error('should not be called');
          };
          this.bs.resume = function () {
            throw Error('should not be called');
          };
          this.bs.on('error', function () {
            throw Error('should not be called');
          });

          //simulate some data
          this.read2.emit('data', 'data');
          this.bs.emit('data', 'nothing');
          this.write2.emit('drain');
          this.read2.emit('end');
          this.callback();
        },
        'will bipass the BufferedStream and go directly to the WriteStream' : function () {
          assert.strictEqual(this.write2.tmp, 'data');
          assert.ok(this.read2.paused);
          assert.ok(this.read2.resume);
          assert.ok(this.write2.hasEnded);
        }
      }
    },
    'ReadStream.pipe(new BufferedStream())' : {
        topic : function () {
            this.read    = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            this.bs = new draino.BufferedStream();
            this.read.pipe(this.bs);
            var self = this;

            this.bs.on('end', function () {
              self.callback(null, self.bs);
            });
        },
        'will emit end when source has ended' : function (error, bs) {
            assert.ok(bs.source.hasEnded);
        },
        'will identify that the source has ended' : function (error, bs) {
            assert.ok(bs.hasEnded);
        }
        ,//will buffer all data
        '.pipe(WriteStream)' : {
            topic : function (bs) {
                this.write = new SimpleWrite()
                this.write.on('pipe', function (source) {
                  this.source = source;
                });
                var self = this;

                this.write.on('success', function (data) {
                  self.callback(null, data);
                });
                bs.pipe(this.write);
            },
            'will call end, becuase the source ended': function () {
              //success is called from end
            },
            'will write the data to the write stream': function (error, data) {
                assert.strictEqual(data, ' A1  A2  A3 ');
            },
            'will forward the source and NOT BufferedStream': function () {
              assert.strictEqual(this.write.source, this.read);
            }
        }
    },
    'ReadStream.pipe(new BufferedStream(size))' : {
        topic : function () {
            this.read    = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            this.bs = new draino.BufferedStream(3);
            this.read.pipe(this.bs);
            var self = this;

            this.bs.once('full', function () {
                self.callback(null, self.bs);
            });
        },
        'will emit full after it has read: size' : function (error, bs) {
            assert.ok(true);
           //TODO better way to make sure we have only read ' A1 '
        },
        'will pause the source once the buffer is full' : function (error, bs) {
            assert.ok(bs.source.paused);
        },
        '.pipe(WriteSteram)' : {
            topic : function (bs) {
                this.write = new SimpleWrite();
                bs.pipe(this.write);
                var self = this;
                this.write.on('success', function(data) {
                  self.callback(null, data);
                });
            },
            'will drain the buffer, resume source and remove itself' : function (data) {
                assert.strictEqual(data, ' A1  A2  A3 ');
            }
        }
    },
    'Pipeing from BufferedStream before pipeing to it' : {
        topic : function () {
            this.read    = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            this.write   = new SimpleWrite();
            this.write.on('pipe', function (source) {
              this.source = source;
            });

            this.bs = new draino.BufferedStream();
            this.bs.write = function () {
              throw new Error('should never be called');
            };
            this.bs.pipe(this.write);

            this.read.pipe(this.bs);

            var self = this;

            this.write.once('success', function (data) {
                self.callback(null, data);
            });
        },
        'will emit end once the read stream has ended' : function () {
          //write emits success on end
        },
        'will write the data directly to the WriteStream': function (error, data) {
          assert.strictEqual(data, ' A1  A2  A3 ');
        },
        'will pass the correct source on pipe to the WriteStream': function () {
          assert.strictEqual(this.write.source, this.read);
        }
    },
    //now we test complex drain cases
    'A StreamBuffer that encounters .write() === false during .drain()': {
        topic : function () {
            this.read    = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 1);
            this.write   = new SimpleWrite(1);

            this.sb = new draino.StreamBuffer(this.write, {hookWrite:true});
            this.read.pipe(this.write);

            var self = this;

            this.read.once('end', function () {
                self.sb.on('close', function () {
                    self.callback(null, self.write.tmp);
                });
                self.sb.drain();
            });
        },
        'will pause for the drain event' : function (error, data) {
            assert.ok(!error);
            assert.strictEqual(data, ' A1  A2  A3 ');
        }
    },
    'temp': {
        topic : function () {
            var self = this;

            this.read    = new SimpleRead(['A1','A2','A3','A4','A5','A6',
                                           'A7','A8','A9','B1','B2','B3'], 3);
            this.write   = new SimpleWrite(1);

            this.sb = new draino.StreamBuffer(this.write);
            this.read.pipe(this.sb);

            this.write.on('pipe', function (source) {
                //to make sure the write gets read, not sb
                self.write._source = source;
            });

            var sbOut = true;
            this.sb.on('close', function () {
                //to make sure that we have a few writes directly
                //from read -> write
                sbOut = false;
            });


            var count = 0;
            this.read.on('data', function () {
                count += 1;
                if (count === 3) {
                    self.sb.drain();
                }
            });

            this.write.on('success', function (data) {
                self.callback(sbOut, self.write.tmp);
            });
        },
        'will pause for the drain event' : function (error, data) {
            assert.ok(!error);
            assert.strictEqual(data, 'A1A2A3A4A5A6A7A8A9B1B2B3');
        }
    },
    'qwer': {
        topic : function () {
            var self = this;

            this.read    = new SimpleRead(['A1','A2','A3','A4','A5','A6',
                                           'A7','A8','A9','B1','B2','B3'], 1);
            this.write   = new SimpleWrite(1);

            this.sb = new draino.StreamBuffer(this.write, {hookWrite:true});

            this.write.on('pipe', function (source) {
                //to make sure the write gets read, not sb
                self.write._source = source;
            });

            this.read.pipe(this.write);

            var sbOut = true;
            this.sb.on('close', function () {
                //to make sure that we have a few writes directly
                //from read -> write
                console.error(self.write.tmp);
                sbOut = false;
            });


            var count = 0;
            this.read.on('data', function () {
                count += 1;
                if (count === 3) {
                    self.sb.drain();
                }
            });

            this.write.on('success', function (data) {
                self.callback(sbOut, self.write.tmp);
            });
        },
        'will pause for the drain event' : function (error, data) {
            assert.ok(!error);
            assert.strictEqual(data, 'A1A2A3A4A5A6A7A8A9B1B2B3');
        }
    }
}).export(module);
