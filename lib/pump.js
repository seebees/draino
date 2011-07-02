/**
     * the main working function for pump
     * pump().from().to() curry parameters into pumpEngien
     */
    pumpEngine = (function () {
        var pump = function (op, toPipe) {
                var _tell = function (error) {
                        op.to.forEach(
                            tell.bind(
                                null, 
                                op.onEach, 
                                toPipe,
                                error
                            )
                        );
                        op.next();
                    };
                
                //pipe the "stream" and tell whoever cares
                if (toEmpty instanceof EventEmitter) {
                    //TODO handle streams that are not read streams
                    op.to.forEach(function (target) {
                        if (target instanceof EventEmitter) {
                            toEmpty.pipe(target);
                        }
                    });
                    
                    toEmpty.
                        on(op.isDry, _tell).
                        on('error', _tell);
                                
                    toEmpty.pause();
                } else if (typeof toEmpty === 'function') {
                    //tread the function as an Emitter and pass the return value on
                } else if (Array.isArray(toEmpty)) {
                    //passed an array? lets pump it
                    toEmpty.forEach(flush.bind(null,op));
                } else {
                    //pipe the literal element
                }
            };
        
        return function (op) {
            //set defaults
            op.next = function () {
                var hasNext = op.from,
                    next;
                while (Array.isArray(hasNext[0]) && hasNext[0].length) {
                    hasNext = hasNext[0]
                }
                
                next = hasNext.shif();
                if (next instanceof EventEmitter) {
                    next.resume();
                } else if (Array.isArray(next) || next) {
                    op.next();
                } else {
                    op.to.forEach(
                        tell.bind(
                            null, 
                            op.onDone
                        )
                    );
                }
            };
            
            op.from.forEach(pump.bind(null,op));
            op.next();
            
        };
    }()),