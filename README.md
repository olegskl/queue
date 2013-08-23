# queue #

Asynchronous, single-worker, adjustable concurrency queue.

## Installation ##

    npm install git://github.com/olegskl/queue.git

or in package.json as a dependency:

    "dependencies": {
        "queue": "git://github.com/olegskl/queue.git"
    }

## Usage ##

    // Require the queue before use:
    var queue = require('queue');

### Run 1000 tasks with default concurrency (10) ###

    var i = 1000, // arbitrary number of items to add to the queue
        myQueue = queue().worker(function (task, done) {
            // do something with the task here...
            done();
            // or done(err); to abort the queue
        }).callback(function (error) {
            // do something when all tasks are completed...
        });

    while (i -= 1) {
        myQueue.add(i); // add value of i as task
    }

    // Close the queue to indicate that the callback is to be issued
    // on the completion of the previously added tasks:
    myQueue.close();

## Test ##

If Mocha is installed, simply:

    mocha

Otherwise:

    npm install
    npm test

## License ##

http://opensource.org/licenses/mit-license.html