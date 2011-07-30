var assert          = require('assert'),
    util            = require('util'),
    vows            = require('vows'),
    draino          = require('draino');

var log = function (msg) {
    console.log(msg);
};
vows.describe('snake').addBatch(
{
    'draino.snake([myName], [noAppend])' : {
        topic : function () {
            this.snake = draino.snake('myName');
            console.log('Log Stmt');
            this.callback();
        },
        'will buffer stdout.write' : function () {
            assert.strictEqual(this.snake.read(), 'Log Stmt\n');
        },
        'will set the snake\'s name' : function () {
            assert.strictEqual(this.snake.name, 'myName');
        },
        '.too([noAppend])' : {
            topic : function () {
                var self = this;
                console.log('noAppend makes things before the snake not append.');
                var snake = self.snake = draino.snake('myName', true);
                console.log('Statements after a new snake are appended.');
                console.error('console.error is not appended');
                process.binding('stdio').writeError('process.binding(\'stdio\').writeError is not appended either, but it could be if you ask me.\n')
                setTimeout(function () {
                    snake.too();
                    console.log('Statements in another event loop after snake.too() are appended');
                    (function () {
                        console.log('Even if they are in a different function');
                    }());
                    log('Even if they no not have scope access to snake');
                    process.nextTick( function () {
                        console.log('Statements without a snake.too(), even proccess.nextTick will not be appended.');
                        process.nextTick( function () {
                            console.log('Statements before snake.too() are appended.');
                            snake.too();
                            process.nextTick( function () {
                                console.log('Statements before snake.too(true) are not appended.');
                                snake.too(true);
                            });
                            process.nextTick( function () {
                                //See ~snake.js:100 both this and the above tick
                                //will be in the same group of process._tickCallback
                                //So they would both log.  I'm going to leave it for now.
                                self.anotherSnake = draino.snake('newSnake', true);
                                snake.too();
                                console.log('Multiple snakes can watch at the same time.');
                                
                            });
                        });
                    });
                },5);
                
                setTimeout(function () {
                    self.callback();
                },10)
            },
            'will buffer output across event loops' : function () {
                assert.strictEqual(
                    this.snake.read(),
                        'Statements after a new snake are appended.\n'                          +
                        'Statements in another event loop after snake.too() are appended\n'     +
                        'Even if they are in a different function\n'                            +
                        'Even if they no not have scope access to snake\n'                      +
                        'Statements before snake.too() are appended.\n'                         +
                        'Multiple snakes can watch at the same time.\n'
                );
            },
            'another snake can watch at the same time.' : function () {
                assert.strictEqual(
                    this.anotherSnake.read(),
                        'Multiple snakes can watch at the same time.\n'
                );
            }
        }
    }
}).export(module);
