var assert          = require('assert'),
    util            = require('util'),
    EventEmitter    = require('events').EventEmitter,
    vows            = require('vows'),
    draino          = require('draino'),
    simple          = function (emptyEvent, endEvent, chunks, delay) {
        var self = this;
        
        EventEmitter.call(self);
        chunks.forEach(function (chunk, i) {
            setTimeout(function () {
                self.emit(emptyEvent, chunk);
            }, delay*i);
        });
        
        setTimeout(function () {
            self.emit(endEvent);
        }, delay*(chunks.length));
    },
    ShinnyEmitter = function () {
        EventEmitter.call(self);
    };
        
util.inherits(simple, EventEmitter);
util.inherits(ShinnyEmitter, EventEmitter);

vows.describe('how to use draino').addBatch(
{
    'Shinning an EventEmitter' : {
        topic : function(){
            var myEmitter = new EventEmitter();
            
            draino.shine(myEmitter);
            this.callback(null, myEmitter);
        },
        'will decorate the EventEmitter.' : function(error, shinyEmitter) {
            assert.ok(shinyEmitter instanceof EventEmitter);
            assert.ok(shinyEmitter.hasOwnProperty('empty'));
            
            
            assert.ok(!shinyEmitter.hasOwnProperty('from'));
            assert.ok(!shinyEmitter.hasOwnProperty('to'));
            assert.ok(!shinyEmitter.hasOwnProperty('toMe'));
            assert.ok(typeof shinyEmitter.empty === 'function');
        }
    },
    'Shinning an class that inherits from EventEmitter' : {
        topic : function(){
            draino.shinePrototype(ShinnyEmitter);
            this.callback(null, ShinnyEmitter);
        },
        'will return will decorate the class.' : function(error, ShinnyEmitter) {
            assert.ok(ShinnyEmitter.prototype.hasOwnProperty('empty'));
            assert.ok(typeof ShinnyEmitter.prototype.empty === 'function');
            
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('to'));
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('from'));
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('isDry'));
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('onDone'));
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('onEach'));
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('onAccumulate'));
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('toMe'));
            assert.ok(!ShinnyEmitter.prototype.hasOwnProperty('flush'));
        }
    },
    'Calling empty()' : {
        topic : function(){
            this.callback(null, draino.empty());
        },
        'will return an option setter for empty().' : function(error, op) {
            assert.ok(op.hasOwnProperty('to'));
            assert.ok(op.hasOwnProperty('from'));
            assert.ok(op.hasOwnProperty('isDry'));
            assert.ok(op.hasOwnProperty('onDone'));
            assert.ok(op.hasOwnProperty('onEach'));
            assert.ok(op.hasOwnProperty('onAccumulate'));
            assert.ok(op.hasOwnProperty('toMe'));
            assert.ok(op.hasOwnProperty('flush'));
            
            assert.ok(typeof op.to === 'function');
            assert.ok(typeof op.from === 'function');
            assert.ok(typeof op.isDry === 'function');
            assert.ok(typeof op.onDone === 'function');
            assert.ok(typeof op.onEach === 'function');
            assert.ok(typeof op.onAccumulate === 'function');
            assert.ok(typeof op.toMe === 'function');
            assert.ok(typeof op.flush === 'function');
        },
    },
    'Passing empty() an EventEmitter' : {
        topic : function(){
            var myEmitter = new EventEmitter();
            this.callback(null, [draino.empty(myEmitter), myEmitter]);
        },
        'will decorate the EventEmitter you pass with an option setter for empty().' : function(error, data) {
            var shinyEmitter = data[0], 
                originalEmitter = data[1];
            
            assert.ok(shinyEmitter instanceof EventEmitter);
            assert.ok(shinyEmitter === originalEmitter);
            assert.ok(shinyEmitter.hasOwnProperty('to'));
            assert.ok(shinyEmitter.hasOwnProperty('from'));
            assert.ok(shinyEmitter.hasOwnProperty('isDry'));
            assert.ok(shinyEmitter.hasOwnProperty('onDone'));
            assert.ok(shinyEmitter.hasOwnProperty('onEach'));
            assert.ok(shinyEmitter.hasOwnProperty('onAccumulate'));
            assert.ok(shinyEmitter.hasOwnProperty('toMe'));
            assert.ok(shinyEmitter.hasOwnProperty('flush'));
            
            assert.ok(typeof shinyEmitter.to === 'function');
            assert.ok(typeof shinyEmitter.from === 'function');
            assert.ok(typeof shinyEmitter.isDry === 'function');
            assert.ok(typeof shinyEmitter.onDone === 'function');
            assert.ok(typeof shinyEmitter.onEach === 'function');
            assert.ok(typeof shinyEmitter.onAccumulate === 'function');
            assert.ok(typeof shinyEmitter.toMe === 'function');
            assert.ok(typeof shinyEmitter.flush === 'function');
            
        }
    },
    'Emptining a "read stream" to itself' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5);
            
            return draino.empty(s).toMe().flush();
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Emptining a "read stream" to a target' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5)
                target = new EventEmitter();
            
            draino.empty(s).to(target).flush();
            
            return target;
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Using an option setter to empty a "read stream"' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5)
                target = new EventEmitter(),
                op = draino.empty();
            
            op.from(s).to(target).flush();
            
            return target;
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Emptying arbitrary events' : {
        topic : function(){
            var s = new simple('myData', 'BeDone', ['one','two','three'], 5)
                target = new EventEmitter();
            
            draino.empty('myData').
                from(s).
                isDry('BeDone').
                to(target).
                onEach('HotDAM').
                flush();
            
            target.on('HotDAM', function (data) {
                this.emit('success', data);
            });
            
            return target;
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing N "read streams"' : {
        topic : function () {
            var accumulate = [],
                target = new EventEmitter();
          
           draino.empty().
               from(
                   new simple('data', 'end', ['i','am','first'], 5),
                   new simple('data', 'end', ['second','stream','here'], 5),
                   new simple('data', 'end', ['three','for','all'], 5)
               ).to(target).
               onEach('got1').
               flush();
          
            target.on('got1',function (data) {
                accumulate.push(data);
                if (accumulate.length === 3) {
                    this.emit('success', accumulate);
                }
            });
               
            return target;
        },
        'will chunk the streams to you.' : function (error, data) {
            assert.strictEqual(data.length, 3);
            assert.strictEqual(data[0], 'iamfirst');
            assert.strictEqual(data[1], 'secondstreamhere');
            assert.strictEqual(data[2], 'threeforall');
        }
    },
    'After flushing all read streams with onDone()' : {
        topic : function () {
            var accumulate = [],
                target = new EventEmitter();
          
           draino.empty().
               from(
                   new simple('data', 'end', ['i','am','first'], 5),
                   new simple('data', 'end', ['second','stream','here'], 5),
                   new simple('data', 'end', ['three','for','all'], 5)
               ).to(target).
               onEach('got1').
               onDone('HotDAM').
               flush();
          
            target.on('HotDAM',function (data) {
                this.emit('success', 'worked');
            });
               
            return target;
        },
        'the onDone event will fire.' : function (error, data) {
            assert.strictEqual(data, 'worked');
        }
    },
    'Flushing to a callback' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5);
            
            draino.empty(s).to(this.callback).flush();
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing from a callback' : {
        topic : function(){
            draino.empty().from(function(){
                return 'onetwothree';
            }).to(this.callback).flush();
        },
        'will return all the data.' : function(error, data) {
            assert.strictEqual(data, 'onetwothree');
        }
    },
    'Flushing read streams and functions' : {
        topic : function () {
            var accumulate = [];
            return draino.empty().from(
                new simple('data', 'end', ['i','am','first'], 5),
                function () { return 'secondstreamhere'; },
                new simple('data', 'end', ['three','for','all'], 5)
            ).toMe('got1').flush().on('got1',function (data) {
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
            
            return draino.empty(s).toMe().flush();
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
    'Flushing an http response' : {
        topic : function(){
           var self = this,
               port = Math.floor(Math.random()*10000+7000),
               server = require('http').createServer(function(request, response) {
                   response.end('Well this actualy works?');
                   server.close();
               });
           
           server.listen(port,'localhost');
           
           require('http').get({
               host: 'localhost',
               port: port,
           }, function (response) {
               response.setEncoding('utf8');
               draino.empty(response).to(self.callback).flush();
           });
        },
        'will return all the data.' : function(error, data) {
            assert.ok(typeof data === 'string');
            assert.strictEqual(data, 'Well this actualy works?');
        }
    },
}).export(module);
