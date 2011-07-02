Draino 0.1.0
===========

(C) ryan emery (seebees@gmail.com) 2011, Licensed under the MIT-LICENSE

A library to flush data from "read streams."  Works with callbacks or arbitrary events, not just 'end' and 'data'.

Features
--------

* natural language ( empty().from(source).to(target).flush() )
* empties arbitrary events not just 'end' and 'data'
* empty from many sources to many sources
* an arbitrary event can fire when all sources are "empty"
* treats functions as sources and targets
* helper functions to decorate your EventEmitters
* fun to write (for me, not you, I don't know anything about your code)
    
    
API
---

### empty(event, [emitter])

The primary entry point.  Will return either an option setter or your emitter, properly decorated.  The event is the source event you wish to empty.  The default source event is 'data'.

### .from(emitter || functions, ...)

Defines additional sources to empty.  You can call it with many arguments or an arrays of emitters.  You can call it several times or even with nested arrays.  When I go to empty them I should find them all.  Currently only functions, EventEmitters or classes the inherit from EventEmitters are supported.  Soon I will support literals.

### .to()(emitter || functions, ...)

Defines targets for the data I am going to empty.  As with .from() you can call .to() with almost any combination of arrays emitters or functions and I should be able to figure it out.

Remember if the SourceEmitter(s) emits multiple isDry events (see .isDry), the TargetEmitter(s) will receive multiple onEach events (see .onEach).  This should make it easy to throttle noisy emitters.

### .toMe(event)

Syntactic sugar for sending arguments to yourself .onEach(event).to(me) (see .onEach).  Hopefully it should make your code more readable.

### .isDry(event)

The event I am listening for on your SourceEmitter(s) that tells me they are empty and that I should notify your TargetEmitter(s), give them the accumulated data, and flush my accumulator.  The default isDry event is 'end'.

### .onEach(event)

The event I will emit to your TargetEmitter(s) along with the accumulated data for each isDry event I receive.  The default onEach event is 'success'.

### .onDone(event)

Optional event I will emit when all SourceEmitters are done.  Will not work if you are expecting multiple isDry events from a given emitter.

### .onAccumulate(function)

Optional accumulation function.  It will be passed all arguments emitted to your source event and you will be returned an array of these values in the onEach event.

### .flush()

Equivalent to run()  This is the last function to call in the chain.  I will line up all the pipes and let'er rip.

### shine(eventEmitter, eventEmitter, ...)

A function to decorate your eventEmitter with empty().  As with to() and from() almost any combination of emitters and arrays will get the job done.

### shinePrototype(EventEmitter)

A function to decorate your EventEmitter children.  e.g. Children.prototype.empty = empty.  As with to() and from() almost any combination of emitters and arrays will get the job done.

NOTE:  If you call shinePrototype() without any arguments I will update EventEmitter.prototype.empty.  Not sure if you really want to do that, but... laugh in the face of danger!

### Buffer vs string

If the stream you are flushing returns buffers you will get an array of them.  Otherwise you will get a string.  I'm kind of on the fence about this.  I'm thinking that I should always return an array, since if you want to, you can always .join(''); yourself...

Example usage
-------------

    var draino = require('draino'),
		http   = require('http'),
		EventEmitter = require('events').EventEmitter;
		
	//Very simple example
	http.get({
		host: 'www.google.com',
		port: 80,
	}, function (response) {
		response.setEncoding('utf8');
		draino.empty(response).to(function (data) {
			//data now has the whole page
		}).flush();
	});
	
	//an exmple that requires a bit of imagination
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
	yourEmitter.empty('data').from(manyResponses).toMe('handelPage').flush();
	
	//Throttling a nosiy event.  Why?  How can you think with all that racket?
	yourEmitter.
		empty('noise').
		from(nosiyEmitter).
		.onAccumulate(function(){
			var times = 0;
			return function(chunk){
				times += 1;
				if (times >5) {
					this.emit('have5');
				}
				return chunk;
			}
		}())).
		isDry('have5').
		toMe('every5').
		flush().
		on('every5',function (have5){
			//do something with your 5 elements
		});

    
Running the tests
-----------------

    vows ./test/test* --spec 
    
TODO
----
* flush an array of literals? e.g. flush(['one','two','three']).to(function(each){}).  Why?  Why not?
* put in NPM