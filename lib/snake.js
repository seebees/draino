var util                = require('util'),
    StreamBuffer        = require('./streambuffer.js').StreamBuffer,
    //a variable to hold the stdoutProxy.  But I will not perpetuate
    //this kind of evil simply becuase you require this file.
    jormungand          = false;
    
function stdoutProxy () {
    var old_stdout = process.stdout.write;
    var self = this;
    StreamBuffer.call(self);
    
    /**
    *   a fuction to get at stdout after all the evil that is about to happen
    */
    self.stdout = function () {
        old_stdout.apply(process.stdout, arguments);
    };
    
    /**
     *  after each event we need to flush everything out to keep the logs clean.
     */
    var needLogReset   = true;
    self.resetLog       = function () {
        watchingSnakes = [];
        needLogReset   = true;
        self.flush();
    };
    
    /**
     *  adding a snake to the jormungand
     *  untill the next "event" I will log everything to
     *  this snake as well
     */
    var watchingSnakes = [];
    self.addSnake = function (snake, noAppend) {
        //make sure I don't append a snake twice
        if (watchingSnakes.indexOf(snake) < 0) {
            //if you really don't want to know about about the backstory
            //for this "event", just say so.
            if (!noAppend) {
                snake.write(self.read());
            }
            //the "work"
            watchingSnakes.push(snake);
            //make sure we stop watching so that the logs are clean
            if (needLogReset) {
                //See the evil below done to process._tickCallback
                //I don't need to do anything, _tickCallback will handel
                //flushing the log and clearing the watchingSnakes
                //I just need to make sure that a tick occurs
                process.nextTick(function () {});
                needLogReset = false;
            }
        }
    };
    
    /**
     * in case you want to stop watching before the end of the event
     */
    self.removeSnake = function (snake) {
        var i = watchingSnakes.indexOf(snake);
        if (i >= 0) {
            watchingSnakes.splice(i,1);
        }
    };
    
    /**
     *  hook stdout so we can watch what is going on
     */
    process.stdout.write = function (chunk) {
        old_stdout.apply(process.stdout, arguments);
        self.write(chunk);
        watchingSnakes.forEach(function (snake) {
            snake.write(chunk);
        });
        if (needLogReset) {
            //See the evil below done to process._tickCallback
            //I don't need to do anything, _tickCallback will handel
            //flushing the log and clearing the watchingSnakes
            //I just need to make sure that a tick occurs
            process.nextTick(function () {});
            needLogReset = false;
        }
    }
    
    //to updo all the horible things I have done and
    //make all hurt as if it had never been.
    var old__tickCallback   = process._tickCallback;
    self.distroy    = function () {
        self.resetLog();
        self.removeAllListeners();
        process._tickCallback   = old__tickCallback;
        process.stdout.write    = old_stdout;
        jormungand              = false;
    };
    
    /**
     *  do horible things to process._tickCallback
     *  this way my log is always clean.
     *
     *  //TODO do I really want to clean before each tick?  I am doing this so that
     *      so that I treat setTimeout, nextTick, and system events the same
     *      but that may not be the right thing to do.
     *  //TODO currenly I am only cleaning before a group of ticks.
     *      I think this is adequate.  but depending on the answer to the above
     *      there may be more work involved.
     */
    process._tickCallback   = function () {
        self.resetLog();
        old__tickCallback.apply(process, arguments);
    };
}
util.inherits(stdoutProxy, StreamBuffer);

/**
 * the class to snake logs for a given execution path
 */
function Snake (name, noAppend) {
    var self = this;
    StreamBuffer.call(self);
    
    self.name = name = name || 'SNAKE';
   
   /**
    *   to append the log in a callback
    */
   self.too = function (noAppend) {
        if (jormungand) {
            jormungand.addSnake(self, noAppend);
        } else {
            jormungand = new stdoutProxy();
            jormungand.addSnake(self, noAppend);
        }
    };
    
    /**
     *  to stop appending the log
     */
    self.pause  = function (){
        jormungand.removeSnake(self);
    };
    
    /**
     *  a function to log out thread for this execution string.
     */
    self.out = function out() {
        self.stdout('::::::START ' + name + ' LOG\n');
        self.stdout(self.read());
        self.stdout('::::::END ' + name + ' LOG\n');
    };
    
    /**
     *  maybe you want to write something but not log it?
     */
    self.stdout = function () {
        jormungand.stdout.apply(this, arguments);
    };
    
    /**
     *  So you now understand what you have wrought?  You want out?
     *  You can stop anytime you want to.
     */
    self.killIt = function () {
        jormungand.distroy();
    };
    
    //well you asked for one, I may as well start logging...
    self.too(noAppend);
}

util.inherits(Snake, stdoutProxy);

/**
 * export a function so people can use me
 */
exports.snake = function(name, noAppend) {
    if (!jormungand) {
        jormungand = new stdoutProxy();
    }
    return new Snake(name, noAppend);
};

/**
 * in case you want to output something but don't want it to be snaked
 * mostly here in case someone want's to snake the file and not the module
 */
exports.stdout = function () {
    if (jormungand) {
        jormungand.stdout.apply(this, arguments);
    } else {
        process.stdout.write.apply(process.stdout.write, arguments);
    }
};
