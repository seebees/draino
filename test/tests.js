var assert          = require('assert'),
    util            = require('util'),
    EventEmitter    = require('events').EventEmitter,
    vows            = require('vows'),
    draino          = require('draino'),
    simple          = function (flushEvent, endEvent, chunks, delay) {
        var self = this;
        
        EventEmitter.call(self);
        chunks.forEach(function (chunk, i) {
            setTimeout(function () {
                self.emit(flushEvent, chunk);
            }, delay*i);
        });
        
        setTimeout(function () {
            self.emit(endEvent);
        }, delay*(chunks.length));
    };
        
util.inherits(simple, EventEmitter);

console.log((new Buffer('b25l','base64').toString('base64')));

vows.describe('how to use draino').addBatch(
{
    'Calling flush' : {
        topic : function(){
            this.callback(null, draino.flush());
        },
        'will return a decorated EventEmitter.' : function(error, emitter) {
            assert.ok(emitter instanceof EventEmitter);
            assert.ok(emitter.hasOwnProperty('flush'));
            assert.ok(emitter.hasOwnProperty('from'));
            assert.ok(emitter.hasOwnProperty('to'));
            assert.ok(emitter.hasOwnProperty('toMe'));
            assert.ok(typeof emitter.flush === 'function');
            assert.ok(typeof emitter.from === 'function');
            assert.ok(typeof emitter.to === 'function');
            assert.ok(typeof emitter.toMe === 'function');
        },
        '.from(readStream).toMe()' : {
            topic : function(shinyEmitter) {
                return shinyEmitter.from(
                    new simple('data', 'end', ['one','two','three'], 5)
                ).toMe();
            },
            'will return the data' : function (error, data) {
                assert.strictEqual(data, 'onetwothree');
            }
        }
    },
    'Passing flush an EventEmitter' : {
        topic : function(){
            var myEmitter = new EventEmitter();
            this.callback(null, [draino.flush(myEmitter), myEmitter]);
        },
        'will decorate the EventEmitter you pass.' : function(error, data) {
            var shinyEmitter = data[0], 
                originalEmitter = data[1];
            assert.ok(shinyEmitter instanceof EventEmitter);
            assert.ok(shinyEmitter === originalEmitter);
            assert.ok(shinyEmitter.hasOwnProperty('flush'));
            assert.ok(shinyEmitter.hasOwnProperty('from'));
            assert.ok(shinyEmitter.hasOwnProperty('to'));
            assert.ok(shinyEmitter.hasOwnProperty('toMe'));
            assert.ok(typeof shinyEmitter.flush === 'function');
            assert.ok(typeof shinyEmitter.from === 'function');
            assert.ok(typeof shinyEmitter.to === 'function');
            assert.ok(typeof shinyEmitter.toMe === 'function');
        },
        ', then calling .from(readStream).toMe()' : {
            topic : function(emitters) {
                var originalEmitter = emitters[1];
                return originalEmitter.flush().from(
                    new simple('data', 'end', ['one','two','three'], 5)
                ).toMe();
            },
            'will return the data' : function (error, data) {
                assert.strictEqual(data, 'onetwothree');
            }
        }
    },
    'Shinning an EventEmitter' : {
        topic : function(){
            var myEmitter = new EventEmitter();
            
            draino.shine(myEmitter);
            this.callback(null, myEmitter);
        },
        'will decorate the EventEmitter with flush.' : function(error, shinyEmitter) {
            assert.ok(shinyEmitter instanceof EventEmitter);
            assert.ok(shinyEmitter.hasOwnProperty('flush'));
            assert.ok(!shinyEmitter.hasOwnProperty('from'));
            assert.ok(!shinyEmitter.hasOwnProperty('to'));
            assert.ok(!shinyEmitter.hasOwnProperty('toMe'));
            assert.ok(typeof shinyEmitter.flush === 'function');
        },
        ', then calling flush().from(readStream).toMe()' : {
            topic : function(shinyEmitter) {
                return shinyEmitter.flush().from(
                    new simple('data', 'end', ['one','two','three'], 5)
                ).toMe();
            },
            'will return the data' : function (error, data) {
                assert.strictEqual(data, 'onetwothree');
            }
        }
    },
    
    'Fush with explicit paramaters' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5),
                c = new EventEmitter();
            
            draino.flush('data').from('end', s).to('success', c);
            return c;
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Fush with default paramaters' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5),
                c = new EventEmitter();
            
            draino.flush(s).to(c);
            return c;
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing a "read stream" toMe' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5);
            
            return draino.flush().from(s).toMe();
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing a "read stream," flushing to itself' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5);
            
            return draino.flush(s).toMe();
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing arbitrary events' : {
        topic : function(){
            var s = new simple('myEvent', 'iBeDone', ['one','two','three'], 5);
            
            return draino.flush(s,'myEvent').from('iBeDone').toMe('hotDAM').on('hotDAM', function (data) {
                this.emit('success', data);
            });
        },
        'will return all the data' : function (error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing to a callback' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5);
            
            draino.flush().from(s).to(this.callback);
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing from a callback' : {
        topic : function(){
            draino.flush().from(function(){
                return 'onetwothree';
            }).to(this.callback);
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing N read streams' : {
        topic : function () {
            var accumulate = [];
            return draino.flush().from(
                new simple('data', 'end', ['i','am','first'], 5),
                new simple('data', 'end', ['second','stream','here'], 5),
                new simple('data', 'end', ['three','for','all'], 5)
            ).toMe('got1').on('got1',function (data) {
                accumulate[accumulate.length] = data;
                if (accumulate.length === 3) {
                    this.emit('success', accumulate);
                }
            });
        },
        'will chunk the streams to you.' : function (error, data) {
            assert.strictEqual(data.length, 3);
            assert.strictEqual(data[0], 'iamfirst');
            assert.strictEqual(data[1], 'secondstreamhere');
            assert.strictEqual(data[2], 'threeforall');
        }
    },
    'Flushing N read streams to a callback' : {
        topic : function () {
            var accumulate = [],
                self = this;
             draino.flush().from(
                new simple('data', 'end', ['i','am','first'], 5),
                new simple('data', 'end', ['second','stream','here'], 5),
                new simple('data', 'end', ['three','for','all'], 5)
            ).to(function (error, data) {
                accumulate[accumulate.length] = data;
                if (accumulate.length === 3) {
                    self.callback(null, accumulate);
                }
            });
        },
        'will chunk the streams to you.' : function (error, data) {
            assert.strictEqual(data.length, 3);
            assert.strictEqual(data[0], 'iamfirst');
            assert.strictEqual(data[1], 'secondstreamhere');
            assert.strictEqual(data[2], 'threeforall');
        }
    },
    'Flushing read streams and functions' : {
        topic : function () {
            var accumulate = [];
            return draino.flush().from(
                new simple('data', 'end', ['i','am','first'], 5),
                function () { return 'secondstreamhere'; },
                new simple('data', 'end', ['three','for','all'], 5)
            ).toMe('got1').on('got1',function (data) {
                accumulate[accumulate.length] = data;
                if (accumulate.length === 3) {
                    this.emit('success', accumulate);
                }
            });
        },
        'will chunk the streams to you.' : function (error, data) {
            assert.strictEqual(data.length, 3);
            assert.strictEqual(data[0], 'secondstreamhere');
            assert.strictEqual(data[1], 'iamfirst');
            assert.strictEqual(data[2], 'threeforall');
        }
    },
    'Flushing a stream with no encodeing toMe' : {
        topic : function(){
            var s = new simple(
                    'data', 
                    'end', 
                    [
                        new Buffer('one'), 
                        new Buffer('two'),
                        new Buffer('three')
                    ], 
                    5
                );
            
            return draino.flush(s).toMe();
        },
        'will return all the data.' : function(error, data) {
            assert.ok(Array.isArray(data));
            assert.strictEqual(data.length, 3);
            assert.ok(Buffer.isBuffer(data[0]));
            assert.ok(Buffer.isBuffer(data[1]));
            assert.ok(Buffer.isBuffer(data[2]));
            assert.strictEqual(data[0].toString('utf-8'), 'one');
            assert.strictEqual(data[1].toString('utf-8'), 'two');
            assert.strictEqual(data[2].toString('utf-8'), 'three');
        }
    },
}).export(module);
