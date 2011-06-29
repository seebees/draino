var util        = require('util'),
    event       = require('events'),
    stream      = require('stream'),
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
    decorate = function (emitter) {
        if (!isEmitter(emitter)) {
            //throw type error
        }
        
        var flushEvent          = 'data',
            toEvent             = 'end',
            flushTo             = [],
            emptyFrom           = [],
            accumulation        = null;
            encodeing           = 'utf-8',
            flushAccumulator    = function (chunk) {
                //TODO need to do type checking (isBuffer) and eat myself
                accumulation += chunk;
            },
            actions = {
                flush   : function (event, accumulator) {
                    if (typeof event === 'string') {
                        flushEvent = event;
                        if (typeof accumulator === 'function') {
                            flushAccumulator = accumulator;
                        }
                    } else if (typeof event === 'function') {
                        flushAccumulator = event;
                    }
                },
                empty   : function (event, accumulator) {
                    
                },
                to      : function (event, callback) {
                    
                    //'callback' can be emitter or function
                    //event can be string, emitter or function
                    
                    //if no emptyFrom then we are flushing ourselves
                    emitter.on(toEvent, function(){
                        
                    });
                    
                    
                    /*
                     * sourceEmitter.flush('data').to('done').on('done',function (data) {
                     *      got all chunks
                     * }
                     */
                    /*
                     * sourceEmitter.flush('data').to('done', otherEmiter);
                     * otherEmiter.on('done', function (data) {
                     *      got all chunks
                     * }
                     */
                    /*
                     * sourceEmitter.flush('data').to(function (error, data) {
                     *      got all chunks
                     * }
                     */
                    
                },
                from    : function () {
                    //To flush many read streams into one
                    
                    /*
                     * destinationEmitter.flush('data').
                     *      from(sourceEmitter, sourceEmitter, ...).
                     * }
                     */
                    
                },
                reset   : function () {
                    flushEvent          = 'data';
                    toEvent             = 'end';
                    flushAccumulator    = false;
                    flushTo             = [];
                    emptyFrom           = [];
                }
            };
        
        return mixin(emitter, actions);
    };



