var util        = require('util'),
    event       = require('events'),
    EventEmitter = event.EventEmitter,
    /**
     * Nice function to apply the properties of source to target
     */
    mixin     = function (target, source) {
        target = target || {};
        Object.keys(source).forEach(function (key) {
            target[key] = source[key];
        });
      
        return target;
    },
    /**
     * simple function to put the whole implementation in one place
     * it wraps util.inherits()
     * @param parent        the parent (first for readability)
     * @param child         the constructor function
     * @param prototype     an object literal to append to child.prototype
     */
    inherit = function (parent, child, prototype) {
        if (typeof child !== 'function') {
            if (typeof child === 'object') {
                prototype = child;
            }
            child = function () {
                parent.apply(this, arguments);
            };
        }
        util.inherits(child, parent);
        child.prototype = mixin(child.prototype, prototype);
        
        return child;
    },
    
    //List of calling structures
    //default flush event is 'data'
    /*
    
    sourceEmitter.flush().to(function (error, allData) {
        allData === chunk += data;
    });
    
    sourceEmitter.flush().to(function (error, allData) {
        allData === chunk += data;
    },function (error, allData) {
        allData === chunk += data;
    });
    
    sourceEmitter.flush().to([function (error, allData) {
        allData === chunk += data;
    },function (error, allData) {
        allData === chunk += data;
    }]);
    
    sourceEmitter.flush().to(function (error, allData) {
        allData === chunk += data;
    }).to(function (error, allData) {
        allData === chunk += data;
    });
    
    //The above patterns work with strings === events and
    //destinationEmitter
    //everywhere you pass a function or a string, if you pass a string
    //you can then pass an EventEmitter, if you pass an EventEmitter the default
    //event is 'end'
    sourceEmitter.flush().to('done').on('done',function (allData) {
        allData === chunk += data;
    });
    
    sourceEmitter.flush().to(destinationEmitter)
    destinationEmitter.on('end',function (allData) {
        allData === chunk += data;
    });
    
    sourceEmitter.flush().to('done', destinationEmitter)
    destinationEmitter.on('done',function (allData) {
        allData === chunk += data;
    });
    
    destinationEmitter.on('done',function (allData) {
        allData === chunk += data;
    });
    sourceEmitter.to('done', destinationEmitter);
    sourceEmitter.flush();
    
    //empty() is the inverse of flush(), from() is the inverse of to() 
    destinationEmitter.empty().from(sourceEmitter, sourceEmitter, ...);
    
    destinationEmitter.empty('data').from(sourceEmitter, sourceEmitter, ...);
    
    destinationEmitter.empty('data').from(sourceEmitter, sourceEmitter, ...).to('done');
    
    */
    ,
    isEmitter = function(toTest){
        if (        toTest instanceof event.EventEmitter) {
            return true;
        } else if ( typeof emitter === 'function'
                 && EventEmitter.prototype.isPrototypeOf(toTest.prototype)
        ) {
            return true;
        } else {
            return false;
        }
    },
    tell = function(cares, toEvent, accumulation, error) {
    	if (!error) {
        	if (typeof cares === 'function') {
    			cares(null, accumulation);
    		} else if (cares instanceof EventEmitter) {
    			cares.emit(_event, accumulation);
    		}
    	} else {
    		if (typeof cares === 'function') {
    			cares(error, accumulation);
    		} else if (cares instanceof EventEmitter) {
    			cares.emit('error', error, accumulation);
    		}
    	}
    },
    flush = function (event, accumulator) {
    	var flushEvent = event || 'data',
    		flushAccumulator; 
    	
    	if (typeof flushEvent === 'string'
         && typeof accumulator === 'function'
    	) {
            flushAccumulator = accumulator;
        } else if (typeof flushEvent === 'function') {
        	flushAccumulator = event;
        	flushEvent = 'data';
        } else {
        	flushEvent = 'data';
        }
    	
    	return {
    		from : function (event /*,sourceEmitter || callback, ...*/) {
    			var endEvent = typeof event === 'string' ? event : 'end',
        			emptyFrom = slice(arguments, typeof event === 'string' ? 1 : 0);
    			
    			return {
    				to : function (event, destination /*, destinationEmitter || callback*/) {
    					var toEvent = typeof event === 'string' ? event : 'end',
	            			emitTo = slice(arguments, typeof event === 'string' ? 1 : 0);
    					
    					emptyFrom.forEach(function (emptyMe) {
    						var accumulation        = null,
	    			            _flushAccumulator	= flushAccumulator ?
    			            		//TODO need isBuffer check
    			            		function (chunk) {
		    			                accumulation += flushAccumulator.apply(this, arguments);
									} :
    			            		function (chunk) {
//										Buffer.isBuffer(chunk) ? 
		    			                accumulation += chunk;
		    			            };
    			            emptyMe.on(flushEvent, _flushAccumulator).
    			            	on(endEvent, function () {
    			            		emitTo.toEach(tell, toEvent, accumulation);
    			            	}).
    			            	on('error', function (ex) {
    			            		emitTo.toEach(tell, toEvent, accumulation, ex);
    			            	});
    					});
    				}
    			}
    			
    		}
    	}
    },
    
    
    
    decorate = function (emitter, event) {
        if (!isEmitter(emitter)) {
            //throw type error
        }
        
        var flushEvent          = 'data',
            endEvent			= event || 'end',
            emptyFrom           = [],
            accumulation        = null,
            encodeing           = 'utf-8',
            _flushAccumulator	= function (chunk) {
                //TODO need to do type checking (isBuffer) and eat myself
                accumulation += chunk;
            },
            flushAccumulator    = _flushAccumulator,
            yell = function(cares, error) {
            	if (!error) {
	            	if (typeof cares === 'function') {
	        			cares(null, accumulation);
	        		} else if (cares instanceof EventEmitter) {
	        			cares.emit(_event, accumulation);
	        		}
            	} else {
            		if (typeof cares === 'function') {
	        			cares(error, accumulation);
	        		} else if (cares instanceof EventEmitter) {
	        			cares.emit('error', error, accumulation);
	        		}
            	}
            },
            actions = {
                flush   : function (event, accumulator) {
                    if (typeof event === 'string') {
                        flushEvent = event;
                        if (typeof accumulator === 'function') {
                            flushAccumulator = accumulator;
                        }
                    } else if (typeof event === 'function') {
                    	//wrap accumulator to type
                        flushAccumulator = event;
                    }
                },
                empty   : function (event, accumulator) {
                	//same as flush?
                    
                },
                to      : function (event, callback) {
                	var _event = typeof event === 'string' ? event : 'end',
            			emitTo = slice(arguments, typeof event === 'string' ? 1 : 0);
                	
                	if (!emitTo.length) {
                		emitTo[0] = emitter;
                	}
                	//TODO need to determin if this to call is a child of a from or a flush

                	if (!emptyFrom.length){
                		emptyFrom.forEach(function (emptyMe) {
                			if (emptyMe instanceof EventEmitter) {
                    			emptyMe.on(endEvent, function () {
                                	emitTo.forEach(yell);
                                }).on('error', function (err) {
                                	emitTo.forEach(yell, err);
                                });
                    		} else if (typeof emptyMe === 'function') {
                    			try {
                    				
                    			}
                    			cares(null, accumulation);
                    		}
                		});
                	} else {
                		this.on(flushEvent, flushAccumulator).on(endEvent, function () {
                        	emitTo.forEach(yell);
                        }).on('error', function (err) {
                        	emitTo.forEach(yell, err);
                        });
                	}
                },
                from    : function (event /*,sourceEmitter || callback, ...*/) {
                    //things to pull from to later
                	var _event = typeof event === 'string' ? event : 'end',
            			_emptyFrom = slice(arguments, typeof event === 'string' ? 1 : 0);
                	
                	//add flushAccumulator each Emitter
                	_emptyFrom.forEach(function (sourceEmitter) {
                		if (isEmitter(sourceEmitter)) {
                			decorate(sourceEmitter, _event);
                			sourceEmitter.on(flushEvent, flushAccumulator);
                		}
                	});
                	
                	//append to emptyFrom so a to() call can gather results
                	emptyFrom.push.apply(emptyFrom, _emptyFrom);
                	
                	
                	
                    
                    /*
                     * destinationEmitter.flush('data').
                     *      from(sourceEmitter, sourceEmitter, ...).
                     * }
                     */
                    
                },
                reset   : function () {
                    flushEvent          = 'data';
                    emptyFrom           = [];
                    flushAccumulator    = _flushAccumulator;
                    accumulation        = null;
                    encodeing           = 'utf-8';
                }
            };
        
        return mixin(emitter, actions);
    };