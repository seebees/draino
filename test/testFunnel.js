var assert          = require('assert'),
    util            = require('util'),
    Stream          = require('stream').Stream,
    vows            = require('vows');
    draino          = require('draino'),
    SimpleWrite     = function (num) {
        var writeCount = 0;
        this.wriatable = true;
        this.tmp = '';
        
        this.write = function(chunk) {
            console.log(chunk);
            if (!num || writeCount < num) {
                writeCount += 1;
                this.tmp += chunk;
                return true;
            } else {
                return false;
            }
        };
        this.end = function () {
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

vows.describe('funnel').addBatch(
{
    'draino.funnel(ReadStream, WriteStream)' : {
        topic : function () {
            this.w = new SimpleWrite();
            this.newWrite = draino.funnel(
                new SimpleRead(['one', 'two', 'three'], 10),
                this.w
            );
            
            return this.newWrite;
        },
        'will return the WriteStream' : function () {
            assert.strictEqual(this.w, this.newWrite);
        },
        'will write the data to the WriteStream.' : function(data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'qwer multipule draino.funnel(ReadStream, WriteStream, {buffer:false})' :{
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
                new SimpleRead(['first' , 'two', 'three'], 10),
                this.newWrite,
                {buffer:false}
            );
            draino.funnel(
                new SimpleRead(['second' , 'two', 'three'], 10),
                this.newWrite,
                {buffer:false}
            );
            draino.funnel(
                new SimpleRead(['third' , 'two', 'three'], 10),
                this.newWrite,
                {buffer:false}
            );
            
            return this.newWrite;
        },
        'will write all the data to the WriteStream in order' : function (data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, 'firsttwothreesecondtwothreethirdtwothree');
        },
        'will emit pipe for each stream' : function () {
            assert.ok(this.newWrite.myPipes.length === 3);
            assert.strictEqual(this.newWrite.currtmp[0], '');
            assert.strictEqual(this.newWrite.currtmp[1], 'firsttwothree');
            assert.strictEqual(this.newWrite.currtmp[2], 'firsttwothreesecondtwothree');
        }
    },
    'asdf multipule draino.funnel(ReadStream, WriteStream)' :{
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
                new SimpleRead(['first' , 'two', 'three'], 10),
                this.newWrite,
                {serial:true}
            );
            draino.funnel(
                new SimpleRead(['second' , 'two', 'three'], 10),
                this.newWrite,
                {serial:true}
            );
            draino.funnel(
                new SimpleRead(['third' , 'two', 'three'], 10),
                this.newWrite,
                {serial:true}
            );
            
            return this.newWrite;
        },
        'will write all the data to the WriteStream in order' : function (data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, 'firsttwothreesecondtwothreethirdtwothree');
        },
        'will emit pipe for each stream' : function () {
            assert.ok(this.newWrite.myPipes.length === 3);
            assert.strictEqual(this.newWrite.currtmp[0], '');
            assert.strictEqual(this.newWrite.currtmp[1], 'firsttwothree');
            assert.strictEqual(this.newWrite.currtmp[2], 'firsttwothreesecondtwothree');
        }
    }
}).export(module);
