Draino 0.1.0
===========

(C) ryan emery (seebees@gmail.com) 2011, Licensed under the MIT-LICENSE

A library to flush data from "read streams."

Features
--------

* simple, .flush(readStream).flush(readStream)
* mix and match flush and funnel for the same destination
* will serialize read sources into one write source
* StreamBuffer allows piping of many Streams to take less then serial time.
* helper functions to decorate your Streams
* SerialPump is a class that inherits from Stream and exposes funnel and flush
* Snake to help with async debugging
* fun to write (for me, not you, I don't know anything about your code)
    
    
API
---

### SerialPump::funnel(source, options)

The instance is the destination.  
Source should be self explanatory.  
Options are:
    {
    //buffer the output until the dest is ready.  default is true
        buffer : [true|false],
    //if a stream completes before the dest is ready for it 
    //should the stream move itself to the top of the que [false] or 
    //do nothing [true] 
        serial : [true|false]
    }
before each source is piped to the destination the 'pipe' event is emitted just like Stream::pipe.
Once every source has been funneled to the destination dest.end() is called.  (//TODO should there be an option to override this?)

the return value is the destination so you can funnel another source.


### SerialPump::flush(source, options)

The instance is the destination.  
Source should be self explanatory.  
Options are:
    {
    //if a stream completes before the dest is ready for it 
    //should the stream move itself to the top of the que [false] or 
    //do nothing [true] 
        serial : [true|false]
    }
before each source is piped to the destination the 'pipe' event is emitted just like Stream::pipe.
Once every source has been funneled to the destination dest.end() is called.  (//TODO should there be an option to override this?) 

the return value is the destination so you can flush another source.

### draino.funnel(source, destination, options)

A method to funnel Streams that are not decorated

### draino.flush(source, destination, options)

A method to flush Streams that are not decorated

### draino.shine()

A method to decorate Streams.  It can decorate instances or classes.  It can handle an array of things or N number of arguments or any combination.  Basically you give it a heap of crap and it will try and decorate it for you. e.g.
draino.shine([a, b, c], [MyStreamClass, [another, StreamClass]], lastStream);

### new StreamBuffer(destination, source, options)

A Stream that buffers writes to be read later.  The source and destination are used by StreamBuffer::drain to extract itself from the equation.
Currently the only option is size.  Which will cause the StreamBuffer to pause the source once a total about of data > size has been written.

### If you create a StreamBuffer with a destination and a source
## StreamBuffer::drain(encoding)

if the underlying source has ended:
* emit's 'pipe' to the destination
* if the destination is writable, dest.write(self.read(encoding))
* if the destination write returns === false, wait for 'drain' to emit 'end' otherwise emit 'end'
* emit 'close'
* self.destroy()
* eat the drain method in case someone tries to call it twice
* return the underlying source

if the underlying source has not ended:
* source.pipe(dest)
* if dest.writable, dest.write(self.read(encoding))
* if dest.write returns === false, source.pause(), otherwise source.resume()
* emit 'close'
* self.destroy()
* eat the drain method in case someone tries to call it twice
* return the underlying source

### If you create a StreamBuffer with only a destination
The stream buffer will replace the destination write method with StreamBuffer::write
## StreamBuffer::drain(encoding)
* replace the destination write method
* dest.write(self.read(encoding))
* self.destroy()

### If you create a StreamBuffer WITHOUT either a destination or a source
The drain method will not exist.

//TODO if you create a StreamBuffer with ONLY a source drain should take an optional destination argument  

### StreamBuffer::writable
true, 'cuase it is a write stream.
### StreamBufer::write(chunk)
the write method.  Currently I do not take encoding.  it is on the TODO list
### StreamBuffer::read(encoding)
returns all data written to the StreamBuffer.
### StreamBuffer::end()
sets StreamBuffer::hasEnded = true and emits('full')
### StreamBuffer::destroy()
removes all listeners and sets up the object to be GCed
### StreamBuffer::destroySoon()
drains the StreamBuffer and .destroy() on 'end'
### StreamBuffer::close()
sets hasEnded = true
### StreamBuffer::hasEnded()
returns whether or not the underlying source has ended.
### StreamBuffer::source()
returns the underlying source
### StreamBuffer::dest()
returns the underlying destination

### Buffer vs string

If your source stream has an Encoding it will write to the StreamBuffer with string.  When you read or drain, I will return one big string.  If your source does not have an encoding it will write to the StreamBuffer with Buffer.  In this case when you drain I will return one big Buffer.

Example usage
-------------

    var draino = require('draino'),
        http   = require('http'),
        fs     = require('fs');
		
	//Very simple example
	var request =http.request({
		host: 'SomeHostThatWantsData.com',
		port: 80,
	}, function (response) {
		//do stuff
	});
        
        for(var i=0; i<20; i++) {
          draino.funnel(
              fs.createReadStream(__filename, {bufferSize:bufferSize}),
              request
          )
        }
    
Running the tests
-----------------

    vows ./test/test* --spec 
    
TODO
----
* prime, a way to make things into streams (function, literals, arrays etc)
* StreamBuffer should take a callback as a destination
* flush should take a callback as a destination
* put in NPM