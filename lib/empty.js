var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    newOp = require('./options.js').newOp,
    tell = require('./options.js').tell,
    /**
     * the Engine function for empty
     */
    emptyEngine = (function() {
        /**
         * the working function
         */
        var empty = function (op, toEmpty) {
            //strings are faster to accumulate with +=, but we don't know if we
            //have a buffer or a string at this point.  So we push to an array,
            //this way we can have only one isBuffer check at the end in tell()
            var accumulation         = [],
                //wrapper for tell, the issue here is an end event that passes a value
                _tell                = function (error) {
                    tell(
                        op.onEach, 
                        typeof accumulation[0] === 'string' ? 
                                accumulation.join('') :
                                accumulation, 
                        error,
                        op.to
                    );
                    accumulation = [];
                    
                    op._emptyCount--
                    if (!op._emptyCount && op.onDone) {
                        tell(op.onDone, null, null, op.to);
                    }
                },
                accumulator;
                
            switch ((typeof op.onAccumulate) + !!op.plow) {
                case 'undefinedfalse':
                    accumulator = function (chunk) {
                         accumulation.push(chunk);
                    };
                    break;
                case 'functionfalse':
                    accumulator = function () {
                        accumulation.push(op.onAccumulate.apply(this, arguments));
                    };
                    break;
                case 'undefinedtrue':
                    accumulator = function (chunk) {
                        accumulation.push(chunk);
                        
                        toEmpty._willPlow++
                        if (op.plow && toEmpty._willPlow > op.plow) {
                            _tell();
                        }
                   };
                   break;
                case 'functiontrue':
                    accumulator = function () {
                        accumulation.push(op.onAccumulate.apply(this, arguments));
                        toEmpty._willPlow++
                        if (op.plow && toEmpty._willPlow > op.plow) {
                            _tell();
                        }
                    };
                    break;
            }
            
            //empty the "stream" and tell whoever cares
            if (toEmpty instanceof EventEmitter) {
                op._emptyCount++;
                toEmpty.
                    on(op.source, accumulator).
                    on(op.isDry, _tell).
                    on('error', _tell);
                
                toEmpty._willPlow = 0;
            } else if (typeof toEmpty === 'function') {
                op._emptyCount++;
                try {
                    accumulator(toEmpty());
                    process.nextTick(_tell);
                } catch (ex) {
                    process.nextTick(_tell.bind(null, ex));
                }
            } else if (Array.isArray(toEmpty)) {
                //passed an array? lets flush it
                toEmpty.forEach(flush.bind(null,op));
            }
        };
        
        /**
         * Setting defaults and how to call the working function
         */
        return function (op) {
            //lets make sure our default options are set
            op.source   = op.source || 'data';
            op.from     = op.from   || [op.self];
            op.isDry    = op.isDry  || 'end';
            op.onEach   = op.onEach || 'success';
            op.to       = op.to     || [op.self];
            op._emptyCount = 0;
            
            if (Array.isArray(op.from)) {
                op.from.forEach(empty.bind(null, op));
            } else {
                empty(op, op.from);
            }
        };
    }());
    
/**
 * 
 */
exports.prepareToEmpty = function(source, emitter, decorateEmitter) {
    var options = {},
        set = newOp(options),
        op = set.op;
    
    set.string('source', source);
    set.emitter('self', emitter);
    op.to           = set.array.bind(op, 'to');
    op.from         = set.array.bind(op, 'from');
    op.isDry        = set.string.bind(op, 'isDry');
    op.onDone       = set.string.bind(op, 'onDone');
    op.onEach       = set.string.bind(op, 'onEach');
    op.onAccumulate = set.fn.bind(op, 'onAccumulate');
    op.plow         = set.number.bind(op, 'plow');
    op.toMe         = function (event) {
        op.onEach(event);
        op.to(options.self);
        return op.getSelf();
    }
    
    if (decorateEmitter) {
        op.flush = function(){
            emptyEngine(options);
            Object.keys(op).forEach(function (key) {
                if (key !== 'getSelf') {
                    delete options.self[key];
                }
            });
            return options.self;
        };
        
        Object.keys(op).forEach(function (key) {
            if (key !== 'getSelf') {
                options.self[key] = op[key];
            }
        });
        
        return options.self;
        
    } else {
        op.flush = function () {
            emptyEngine(options);
            return options.self;
        };
        
        return op;
    }
};


