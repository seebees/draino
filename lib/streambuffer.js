//helpers and dependancies
var util      = require('util'),
    Stream    = require('stream').Stream,
    inherit   = function (parent, child, prototype) {

      //inherit
      util.inherits(child, parent);

      //add some other stuff
      for (var i in prototype) {
        if (prototype.hasOwnProperty(i)) {
          child.prototype[i] = prototype[i];
        }
      }

      return child;
    };


    /**
     *  BufferStream will buffer writes and then push them on .pipe().
     *  However the goal is to not present an opaque buffer to the dest,
     *  but to directly link the source and dest.  Therfore:
     *    source.pipe(new BufferStream()).pipe(dest);
     *  sould be exactly equivilant to
     *    source.pipe(dest);
     *  The only functinal value BufferStream should offer is to alow time
     *  between the start of source and the start of dest.
     */
var BufferedStream = exports.BufferedStream = inherit(
      Stream,
      function (size) {
        if (!(this instanceof BufferedStream)) {
          return new BufferedStream(size);
        }

        if (size === undefined) {
          size = Infinity;
        }

        Stream.call(this);
        this.buffer   = [];
        this.encoding = [];
        this.total    = 0;
        this.hasEnded = false;
        this.size     = size || false;

        // store the source on 'pipe' so I can tell the dest about
        // the source and link the source directly to the dest
        this.once('pipe', function (source) {
          this.source = source;
          if (this.dest) {
            this.pipe(this.dest, this.options);
          }
        });
      },
      //additional stuff
      {
        writable: true,
        readable:  true,
        write: function (chunk, encoding) {
          // only buffer things
          if (chunk !== undefined && chunk !== null) {
            // TODO some kind of magic concat?  but then I have
            // accumulation issues, encoding issues and it is nice
            // that what goes to dest is __exactly__ what came to buffer.
            this.buffer.push(chunk);
            // store the encoding
            this.encoding.push(encoding);
            this.total += chunk.length;

            if (!this.size || this.total > this.size) {
              this.pause();
              this.emit('full');
              return false;
            }
          }
        },
        /**
         * BufferStream.pipe() will
         * 1.  Pause the source (from .on('pipe'))
         * 2.  Pipe the source to dest (for type checking, and etc.)
         * 3.  Empty the buffer into dest
         * 4.  Resume the source
         * 5.  Destroy itself
         */
        pipe: (function () {
          return function pipe (dest, options) {
            this.dest = dest;
            this.options = options || {};
            drain.call(this);
            return dest;
          };

          var pipeOnce = false,
              drainMagic;
          function drain () {
            if (!this.source) {
              // all the pipeing will be handled on pipe
              // TODO should writes to me be comigled with writes from
              // a pipe?
              return;
            }

            var self = this;
            // If I have a source and dest, make sure that dest
            // knows that it is getting data from source not from the
            // buffer
            if (!pipeOnce) {
              if (self.hasEnded) {
                // source has ended, simulate the pipe event
                self.dest.emit('pipe', self.source);
              } else {
                // pause source while we empty buffer
                self.source.pause();
                // pipe the source to the dest
                self.source.pipe(self.dest, self.options);
                // remove dest.on('drain') or when I empty the buffer
                // 'drain' events from the dest will resume the source
                // which could cause writes to dest to be out of order
                // i.e. if source writes on source.resume()
                drainMagic = self.dest.listeners('drain').pop();
              }
              //don't do it again
              pipeOnce = true;
            }

            if (self.total && self.readable &&
                empty.call(self) === false) {
              //buffer not empty, wait for drain and try again
              dest.once('drain', function () {
                self.drain();
              });
              return;
            }

            // buffer empty, clean up source and dest
            if (self.hasEnded) {
              if (self.options.end !== false) {
                //tell dest
                self.dest.end();
              }
            } else {
              // re-wire dest.on(drain) and resume
              self.dest.on('drain', drainMagic);
              self.source.resume();
            }

            //my work here is done
            self.destroy();
          }

          /**
          *  Helper function to empty the buffer into a dest write stream
          *
          *  will return false if it is unable to empty the buffer,
          *  the caller must handle the drain event
          *
          *  I do not support holding the buffer in-between the source and dest.
          *  The case where reads are significantly less expensive then writes
          *  seems like something that should be handled in the stream, not
          *  in a buffer
          */
         function empty () {
           if (this.dest && this.dest.writable) {
            var l = this.buffer.length;
             for (var i = 0; i < l; i++) {
               var chunk    = this.buffer.shift(),
                   encoding = this.encoding.shift() || false;

                 this.total -= chunk.length;
               // write the chunk, with or without encoding, this way I don't
               // pass an argument, which might mess someone up,
               // e.g. arugments.length > 1
               if (encoding &&
                   this.dest.write(chunk, encoding) === false) {
                 return false;
               } else if (this.dest.write(chunk) === false) {
                 return false;
               }
             }
           }
         }
        }()),
        // a way to flush the buffer
        flush: function () {
          this.buffer   = [];
          this.encoding = [];
          this.total    = 0;
        },
        end: function (chunk, encoding) {
          this.write(chunk, encoding)
          this.hasEnded = true;
          this.emit('end');
        },
        destroy: function () {
          this.flush();
          this.emit('close');
          this.removeAllListeners();
          this.hasEnded = true;
          delete this.source;
          delete this.dest;

        },
        //TODO should have a hasClosed?
        close: function () {
          this.hasEnded = true;
        },
        pause: function() {
          this.emit('pause');
        },
        resume: function() {
          this.emit('resume');
        }
      });

    /**
     *  StreamBuffer is not a Stream.  It is a way for Streams to implement an
     *  internal buffer durring setup.  If asyc operations are nessicary
     *  for a stream durring construction a StreamBuffer can be used to
     *  wrap the Stream and protect it from writes before these required
     *  asyc operations complete.
     *
     *  function MyStream() {
     *    var buffer = StreamBuffer(this);
     *    async(function callback(
     *      //async done stream now ready
     *      buffer.drain();
     *    ));
     *  }
     *
     *  var s = new MyStream();
     *  s.write('will be buffered');
     *
     *  StreamBuffer does this by replaceing the .write and .end functions of
     *  the wraped stream with it's own internal methods, on .drain() the
     *  StreamBuffer will restore the original .write and .end functions
     *  after the buffer has been fully drained
     */
var StreamBuffer = exports.StreamBuffer = inherit(
      require('events').EventEmitter,
      function (dest, size) {
        if (!(this instanceof StreamBuffer)) {
          return new StreamBuffer(dest, size);
        }

        if (size === undefined) {
          size = Infinity;
        }

        var self      = this;
            buffer    = [],
            enc       = [],
            total     = 0,
            hasEnded  = false,
            destEnd   = dest.end
            destWrite = dest.write;

        dest.write    = write;
        dest.end      = end;

        self.drain    = function () {
            if (total && dest.writable &&
                empty() === false) {
              //buffer not empty, wait for drain and try again
              dest.once('drain', function () {
                self.drain();
              });
              return false;
            }

            // buffer empty, clean up source and dest
            dest.write  = destWrite;
            dest.end    = destEnd;
            // if dest.end was called before the buffer drained, end now
            if (hasEnded) {
              dest.end();
            }
        };

        /**
         *  write function to replace WriteStream.write
         */
        function write (chunk, encoding) {
          // only buffer things
          if (chunk !== undefined && chunk !== null) {
            // store the encoding
            enc.push(encoding);
            // TODO some kind of magic concat?  but then I have
            // accumulation issues, encoding issues and it is nice
            // that what goes to dest is __exactly__ what came to buffer.
            buffer.push(chunk);
            total += chunk.length;

            if (total > size) {
              dest.pause();
              self.emit('full');
              return false;
            }
          }
        }

        /**
         *  end function to replace WriteStream.end.  This is to handle
         *  the case where the source resumes because of the drain event
         *  emitted while the buffer is emptying and ends before the buffer
         *  fully empties.  It is an admittedly strange
         *  case, but completeness counts.
         */
        function end (chunk, encoding) {
          write(chunk, encoding);
          hasEnded = true;
        }

        /**
          *  Helper function to empty the buffer into a dest write stream
          *
          *  will return false if it is unable to empty the buffer,
          *  the caller must handle the drain event
          *
          *  I do not support holding the buffer in-between the source and dest.
          *  The case where reads are significantly less expensive then writes
          *  seems like something that should be handled in the stream, not
          *  in a buffer
          */
        function empty () {
          if (dest && dest.writable) {
            var l = buffer.length;
            for (var i = 0; i < l; i++) {
              var chunk     = buffer.shift(),
                  encoding  = enc.shift() || false;

              total -= chunk.length;
              // write the chunk, with or without encoding, this way I don't
              // pass an argument, which might mess someone up,
              // e.g. arugments.length > 1
              if (encoding &&
                  destWrite.call(dest, chunk, encoding) === false) {
                return false;
              } else if (destWrite.call(dest, chunk) === false) {
                return false;
              }
            }
          }
        }
      }
    );

