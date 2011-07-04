var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Stream       = require('streams').Stream,
    newOp = require('./options.js').newOp,
    tell = require('./options.js').tell,
    /**
     * the main working function for pump
     * pump().from().to() curry parameters into pumpEngien
     */
    pumpEngine = (function () {
        var pipe = function (op, toPipe) {
                if (toEmpty instanceof Stream) {
                    if (Array.isArray(op.to)) {
                        op.to.forEach(function (target) {
                            if (target instanceof EventEmitter) {
                                toEmpty.pipe(target);
                            }
                        });
                    } else {
                        toEmpty.pipe(op.to);
                    }
                } else if (typeof toEmpty === 'function') {
                    //treat the function as an Emitter and pass the return value on
                }
            };
            
        function pipeNext (op) {
            var hasNext = op.from,
                next;
            while (Array.isArray(hasNext[0]) && hasNext[0].length) {
                hasNext = hasNext[0]
            }
            
            next = hasNext.shif();
            if (next instanceof EventEmitter) {
                pipe(op, next);
            } else if (Array.isArray(next) || next) {
                pipeNext(op);
            } else {
                op.to.forEach(
                    tell.bind(
                        null, 
                        op.onDone
                    )
                );
            }
        };
        
        return function (op) {
            //set defaults
            op.source   = op.source || 'data';
            op.from     = op.from   || [op.self];
            op.isDry    = op.isDry  || 'end';
            op.onEach   = op.onEach || 'success';
            op.to       = op.to     || [op.self];
            op._pumpCount = 0;
            
            pipeNext(op);
            
        };
    }());

/**
 * 
 */
exports.prepareToPump = function (source, emitter, decorateEmitter) {
    var options = {},
        set = newOp(options),
        op = set.op;
    
    set.string('source', source);
    set.emitter(emitter);
    op.to           = set.array.bind(op, 'to');
    op.from         = set.array.bind(op, 'from');
    op.isDry        = set.string.bind(op, 'isDry');
    op.onDone       = set.string.bind(op, 'onDone');
    op.onEach       = set.string.bind(op, 'onEach');
    op.toMe         = function (event) {
        op.onEach(event);
        op.to(options.self);
        return op.getSelf();
    };
    
    if (decorateEmitter) {
        op.flush = function () {
            pumpEngine(options);
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
            pumpEngine(options);
            return options.self;
        };
        
        return op;
    }
};