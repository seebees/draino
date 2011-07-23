var assert          = require('assert'),
    util            = require('util'),
    Stream          = require('stream').Stream,
    vows            = require('vows');
    draino          = require('draino'),
    SimpleWrite     = function (num) {
        var writeCount = 0;
        this.tmp = '';
        
        this.write = function(chunk) {
            if (!num || writeCount < num) {
                writeCount += 1;
                this.tmp += chunk;
                return true;
            } else {
                return false;
            }
        }
    },
    SimpleRead      = function (emitEvent, endEvent, chunks, delay) {
        var self = this;
        
        delay = delay || 1;
        Stream.call(self);
        if (Array.isArray(chunks)) {
            chunks.forEach(function (chunk, i) {
                setTimeout(function () {
                        self.emit(emitEvent, chunk);
                    }, 10
                );
            });
            
            setTimeout(function () {
                self.emit(endEvent);
            }, delay*(chunks.length));
        }
    },
    ShinnyEmitter = function () {
        EventEmitter.call(self);
    };
    
util.inherits(SimpleWrite, Stream);
util.inherits(SimpleRead, Stream);
util.inherits(ShinnyEmitter, process.EventEmitter);


vows.describe('how to use draino').addBatch(
{
    'this is the test' : {
        topic : function(){
            var r = new SimpleRead('data', 'end', ['one', 'two', 'three'], 5),
                w = new SimpleWrite();
                w.asdf = 'asdf';
            
            //Need to have a to that has a write method
            
            return draino.pump(r, w).
                onDone('asdf').
                flush().
                on('asdf', function () {
                    console.dir(this);
                    this.emit('success', this.tmp);
                });
        },
        'will return all the data.' : function(error, data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, 'Well this actualy works?');
        }
    }
}).export(module);
