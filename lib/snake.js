var util = require('util'),
    /**
     * shorthand for
     * Array.prototype.slice.call(object, ...)
     */
    slice = (function (slice) {
        return function (object) {
            return slice.apply(object, slice.call(arguments, 1));
        };
    }([].slice)),
    //get the old console output so we can roll back if we want to
    old_stdout         = process.stdout.write,
    old_writeError     = process.binding('stdio').writeError,
    //internal stdout/stderr so we don't log everything twice
    stdout              = old_stdout.bind(process.stdout);
    stderr             = old_writeError.bind(process.binding('stdio'));
    //an array to buffer output in case someone wants it latter e.g. snake.too()
    undirectedOuput     = [],
    //helper so we don't call process.nextTick(resetLog) more then we need to
    quedLogReset     = false;
    //we only want logs from a snaked process, this resets the log
    resetLog = function () {
        undirectedOuput     = [];
        logOut = undirectedLog;
        quedLogReset = false;
    },
    //default log function
    undirectedLog     = function () {
        undirectedOuput.push(slice(arguments));
        if (!quedLogReset) {
            //reset everything 'cause next time through may be a different snake
            process.nextTick(resetLog);
            quedLogReset = true;
        }
    },
    //working log function (see hookOutput, directLogToSnake and Snake::logToMe)
    logOut             = undirectedLog,
    //uh... direct the log to a given snake? see Snake::too()
    directLogToSnake = function (snake) {
        //TODO how do I deal with competing snakes?
        snake.log = snake.log.concat(undirectedOuput);
        undirectedOuput = [];
        logOut = snake.logToMe;
        if (!quedLogReset) {
            process.nextTick(resetLog);
            quedLogReset = true;
        }
    },
    //we should only need to hook the output once
    outputHooked = false,
    //do the hooking
    hookOutput = function (hook) {
        if (hook) {
            process.stdout.write = function () {
                logOut.apply(null, arguments);
                stdout.apply(null, arguments);
            };
            process.binding('stdio').writeError = function () {
                logOut.apply(null, arguments);
                stderr.apply(null, arguments);
            };
        } else {
            process.stdout.write = old_stdout;
            process.binding('stdio').writeError = old_writeError;
        }
    };
    
/**
 * the class to store logs for a given execution path
 */
function Snake() {
    var self = this;
    
    self._log = [];
    
    self.logToMe = (function () {
        self.log = self.log.concat(slice(arguments));
    }).bind(self);
    
    self.too = directLogToSnake.bind(self);
    
    self.out = function () {
        stdout('SNAKE LOG::::::');
        stdout(util.inspect(self.log));
    };
    
    self.too();
}

    
/**
 * export a function so people can use me
 */
exports.snake = function() {
    if (!outputHooked) {
        hookOutput();
    }
    return new Snake();
};

/**
 * in case you want to output something but don't want it to be snaked
 */
exports.stdout = stdout;
exports.stderr = stderr;
