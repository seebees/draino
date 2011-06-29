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

vows.describe('how to use draino').addBatch(
{
    'A basic fush' : {
        topic : function(){
            var s = new simple('data', 'end', ['one','two','three'], 5),
                c = new EventEmitter();
            
            draino.flush('data').from('end', s).to('success', c);
            return c;
        },
        'will return all the data.' : function(error, data) {
            console.log(data);
        }
    }
}).export(module);
