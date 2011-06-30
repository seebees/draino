Draino 0.1.0
===========

(C) ryan emery (seebees@gmail.com) 2011, Licensed under the MIT-LICENSE

A function to flush data from read streams

Features
--------

* natural language (flush -> from -> toMe)
* flushing arbitrary events from many streams into one stream
* flushing arbitrary events from one stream into many streams
* flushing arbitrary events from one stream into a callback
* flushing arbitrary events from many streams into many callbacks
* fun to write (for me, not you, I don't know anything about your code)
    
    
API
---

### flush(EventEmitter, EventToFlush, OptionalAccumulator)

The primary entry point.  This function returns a decorated EventEmitter, even if no EventEmitter is passed.  The default event to flush is 'data'.  The function is "overloaded" so it should understand rational calling patters, e.g flush('myEvent').  The OptionalAccumulator will receive all arguments emitted to EventToFlush.  The default accumulator is expecting only one argument, chunk.

### flush().from(EndEvent, SourceEmitter || functions, SourceEmitter || functions, ...)

Called after flush.  Defines from whence we are going to receive data.  EndEvent defines when a given accumulation is done.  'end' is default EndEvent.  All other arguments can be either EventEmitters or functions.  If no sources are passed, then the current EventEmitter will be used as the source.  Again, the function is "overloaded" so if you omit EndEvent, I don't mind.  Also, if you have an array of elements you can just call .from([]) instead of having to .from.apply(context, []);

### flush().to()(TargetEvent, TargetEmitter || functions, TargetEmitter || functions, ...)

Called after either flush or from.  Defines the target for our accumulation.  'success' is the default TargetEvent.  Also, if you have an array of elements you can just call .from([]) instead of having to .from.apply(context, []);

### flush().toMe(TargetEvent)

Called after either flush or from.  Syntactic sugar for sending arguments to yourself.  Hopefully it should make your code more readable.

### shine(EventEmitter, EventEmitter, ...)

A function to decorate your EventEmitter with flush()

### shineAllEventEmitters()

A function to EventEmitter.prototype.flush = flush;  Not sure if you really want to do that, but... laugh in the face of danger!

### Buffer vs string

If the stream you are flushing returns buffers you will get an array of them.  Otherwise you will get a string.  I'm kind of on the fence about this.  I'm thinking that I should always return an array, since if you want to, you can always .join(''); yourself...

Example usage
-------------

    var draino = require('draino'),
		http   = require('http'),
		EventEmitter = require('events').EventEmitter;
		
	http.get({
		host: 'www.google.com',
		port: 80,
	}, function (response) {
		response.setEncoding('utf8');
		draino.flush(response).to(function (data) {
			//data now has the whole page
		})
	});
	
	var i, 
		//imagin this is your special emitter
		yourEmitter = new EventEmitter(),
		//imagin this was a lot of streams (files, request, crazy stuff)
		manyResponses = [];
	
	//decorate your emitter
	draino.shine(yourEmitter);
	
	//your emitter does something with pages
	yourEmitter.on('handelPage', function(page) {
		//do something with each page
	});
	
	//get a lot of streams
	for (i=0; i<10; i++) {
		http.get({
			host: 'www.google.com',
			port: 80,
		}, function (response) {
			response.setEncoding('utf8');
			manyResponses.push(response);			
		});
	}
	
	//flush the data
	yourEmitter.flush('data').from(manyResponses).toMe('handelPage');

    
Running the tests
-----------------

    vows ./tests/test* --spec 
    
TODO
----
* handle nested from() calls e.g. flush().from().from().from().to() not even sure what should happen
* nested accumulation if from() is passed [EventEmitter, EventEmitter,...]?
* flush an array of literals? e.g. flush(['one','two','three']).to(function(each){}).  Why?  Why not?