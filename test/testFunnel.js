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
                clearTimeout(self.pending);
                delete self.pending;
            }
        };
        
        self.resume = function () {
            next();
        };
        
    },
    ShinnyEmitter = function () {
        EventEmitter.call(self);
    };
    
util.inherits(SimpleWrite, Stream);
util.inherits(SimpleRead, Stream);
util.inherits(ShinnyEmitter, process.EventEmitter);

vows.describe('draino.funnel').addBatch(
{
    'the basic test objects' : {
        topic : function () {
            var read  = new SimpleRead([' A1 ', ' A2 ', ' A3 '], 10);
            var write = new SimpleWrite();
            read.pipe(write);
            return write;
        },
        'will pipe data' : function (data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, ' A1  A2  A3 ');
        }
    },
    'draino.funnel(ReadStream, WriteStream, {serial:true, buffer:false})' : {
        topic : function () {
            this.w = new SimpleWrite();
            this.newWrite = draino.funnel(
                new SimpleRead([' A1 ', ' A2 ', ' A3 '], 10),
                this.w,
                {serial:true, buffer:false}
            );
            
            return this.newWrite;
        },
        'will return the WriteStream' : function () {
            assert.strictEqual(this.w, this.newWrite);
        },
        'will write the data to the WriteStream.' : function(data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, ' A1  A2  A3 ');
        }
    },
    'multipule draino.funnel(ReadStream, WriteStream, {serial:true, buffer:false})' :{
        topic : function () {
            this.newWrite           = new SimpleWrite();
            this.newWrite.funnel    = draino.SerialPump.prototype.funnel;
            this.newWrite.myPipes   = []
            this.newWrite.currtmp   = []
            
            this.newWrite.on('pipe', function(source) {
                this.myPipes.push(source);
                this.currtmp.push(this.tmp);
            });
            
            draino.funnel(
                new SimpleRead([' A1 ' , ' A2 ', ' A3 '], 10),
                this.newWrite,
                {serial:true, buffer:false}
            );
            draino.funnel(
                new SimpleRead([' B1 ' ,' B2 ', ' B3 '], 5),
                this.newWrite,
                {serial:true, buffer:false}
            );
            draino.funnel(
                new SimpleRead([' C1 ' , ' C2 ', ' C3 '], 20),
                this.newWrite,
                {serial:true, buffer:false}
            );
            
            return this.newWrite;
        },
        'will write all the data to the WriteStream in order' : function (data) {
            assert.ok(typeof data === 'string');
            
            assert.strictEqual(data, ' A1  A2  A3  B1  B2  B3  C1  C2  C3 ');
        },
        'will emit pipe for each stream in order' : function () {
            assert.ok(this.newWrite.myPipes.length === 3);
            assert.strictEqual(this.newWrite.currtmp[0], '');
            assert.strictEqual(this.newWrite.currtmp[1], ' A1  A2  A3 ');
            assert.strictEqual(this.newWrite.currtmp[2], ' A1  A2  A3  B1  B2  B3 ');
        },
        'will take serial time to complete' : function () {
            var timeToComplete = this.newWrite.stopTime.getTime() - this.newWrite.startTime.getTime();
            assert.ok(timeToComplete > 10*3 + 5*3 + 20*3);
        }
    },
    'multipule draino.funnel(ReadStream, WriteStream, {serial:true, buffer:true})' :{
        topic : function () {
            this.newWrite           = new SimpleWrite();
            this.newWrite.funnel    = draino.SerialPump.prototype.funnel;
            this.newWrite.myPipes   = []
            this.newWrite.currtmp   = []
            
            this.newWrite.on('pipe', function(source) {
                this.myPipes.push(source);
                this.currtmp.push(this.tmp);
            });
            
            draino.funnel(
                new SimpleRead([' A1 ' , ' A2 ', ' A3 '], 10),
                this.newWrite,
                {serial:true, buffer:true}
            );
            draino.funnel(
                new SimpleRead([' B1 ' ,' B2 ', ' B3 '], 20),
                this.newWrite,
                {serial:true, buffer:true}
            );
            draino.funnel(
                new SimpleRead([' C1 ' , ' C2 ', ' C3 '], 5),
                this.newWrite,
                {serial:true, buffer:true}
            );
            
            return this.newWrite;
        },
        'will write all the data to the WriteStream in order' : function (data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, ' A1  A2  A3  B1  B2  B3  C1  C2  C3 ');
        },
        'will emit pipe for each stream in order' : function () {
            assert.ok(this.newWrite.myPipes.length === 3);
            assert.strictEqual(this.newWrite.currtmp[0], '');
            assert.strictEqual(this.newWrite.currtmp[1], ' A1  A2  A3 ');
            assert.strictEqual(this.newWrite.currtmp[2], ' A1  A2  A3  B1  B2  B3 ');
        },
        'will take less then serial time to complete' : function () {
            var timeToComplete = this.newWrite.stopTime.getTime() - this.newWrite.startTime.getTime();
            //console.log(timeToComplete);
            assert.ok(timeToComplete < 10*3 + 5*3 + 20*3);
        }
    },
    'multipule draino.funnel(ReadStream, WriteStream, {serial:false, buffer:true})' :{
        topic : function () {
            this.newWrite           = new SimpleWrite();
            this.newWrite.funnel    = draino.SerialPump.prototype.funnel;
            this.newWrite.myPipes   = [];
            this.newWrite.currtmp   = [];
            
            this.newWrite._buffer = [];
            
            this.newWrite.on('pipe', function(source) {
                this.myPipes.push(source);
                this.currtmp.push(this.tmp);
            });
            
            draino.funnel(
                new SimpleRead([' A1 ' , ' A2 ', ' A3 '], 10),
                this.newWrite,
                {serial:false, buffer:true}
            );
            draino.funnel(
                new SimpleRead([' B1 ' ,' B2 ', ' B3 '], 20),
                this.newWrite,
                {serial:false, buffer:true}
            );
            draino.funnel(
                new SimpleRead([' C1 ' , ' C2 ', ' C3 '], 5),
                this.newWrite,
                {serial:false, buffer:true}
            );
            
            return this.newWrite;
        },
        'will write all the data to the WriteStream in the order completed' : function (data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, ' A1  A2  A3  C1  C2  C3  B1  B2  B3 ');
        },
        'will emit pipe for each stream in the order processed.' : function () {
            assert.ok(this.newWrite.myPipes.length === 3);
            assert.strictEqual(this.newWrite.currtmp[0], '');
            assert.strictEqual(this.newWrite.currtmp[1], ' A1  A2  A3 ');
            assert.strictEqual(this.newWrite.currtmp[2], ' A1  A2  A3  C1  C2  C3 ');
        },
        'will take less then serial time to complete' : function () {
            var timeToComplete = this.newWrite.stopTime.getTime() - this.newWrite.startTime.getTime();
            //console.log(timeToComplete);
            assert.ok(timeToComplete < 10*3 + 5*3 + 20*3);
        }
    },
    'draino.funnel' : {
        topic: function () {
            var fs = require('fs');
            
            var times       = 21;
            var bufferSize  = 1024*20;
            var i;
            
            var pipeWrite   = new SimpleWrite();
            var pipeStreams = [];
            
            var funnelWrite = new SimpleWrite();
            
            for (i = 0; i < times; i++) {
                var tmp = fs.createReadStream(__filename, {bufferSize:bufferSize});
                pipeStreams.push(tmp);
                tmp.pause();
            }
            
            var next = pipeStreams.shift();
            
            function nextPipe () {
                var next = pipeStreams.shift();
                if (next) {
                    next.resume();
                    next.pipe(pipeWrite, {end:false});
                    next.on('end', nextPipe);
                } else {
                    pipeWrite.end();
                }
            }
            
            next.resume();
            next.pipe(pipeWrite, {end:false});
            next.on('end', nextPipe);
            
            var funnelWrite = new SimpleWrite();
            
            for (i = 0; i < times; i++) {
                draino.funnel(
                    fs.createReadStream(__filename, {bufferSize:bufferSize}),
                    funnelWrite
                );
            }
            
            var monitor = new process.EventEmitter();
            
            var self = this
            pipeWrite.on('success', function () {
                self.pipeDone = true;
                if (self.funnelDone) {
                    self.callback(null, {
                        pipe   : pipeWrite,
                        funnel : funnelWrite
                    });
                }
            });
            
            funnelWrite.on('success', function () {
                self.funnelDone = true;
                if (self.pipeDone) {
                    self.callback(null, {
                        pipe   : pipeWrite,
                        funnel : funnelWrite
                    });
                }
            });
        },
        'will be performant' : function (error, data) {
            
            //console.dir({
            //    pipeStart   : data.pipe.startTime.getTime(),
            //    pipeStop    : data.pipe.stopTime.getTime(),
            //    funnelStart : data.funnel.startTime.getTime(),
            //    funnelStop  : data.funnel.stopTime.getTime()
            //})
            
            assert.ok(data.funnel.startTime = data.pipe.startTime);
            assert.ok(data.funnel.stopTime  <= data.pipe.stopTime);
            
            //console.log('Faster:' + (data.pipe.stopTime.getTime() - data.funnel.stopTime.getTime()));
        }
    }
}).export(module);
