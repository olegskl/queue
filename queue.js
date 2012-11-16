// JSLint directives:
/*jslint node: true */

// ECMAScript 5 strict mode:
'use strict';

/**
 * Default noop function.
 * @returns {undefined}
 */

var noop = function () {};

/**
 * Creates a new queue.
 * @param {Object} initalOptions Options object.
 * @returns {Function} A new queue function object.
 */

exports.create = function (initialOptions) {

    var options = {
            closed: false, // by default the queue is open
            concurrency: 10, // task concurrency limir
            worker: noop, // worker function to run for every queue item
            callback: noop // callback to issue on queue completion
        },
        items = [], // container of items to process
        running = 0; // count of currently running items

    function work() {

        // Abort when running at full capacity,
        // or if there are no items to process:
        if (running >= options.concurrency || !items.length) {
            return;
        }

        // Keep track of the number of running items:
        running += 1;

        // Invoke the working function by passing it as second parameter
        // a mandatory callback function that must be called upon completion
        // of a task so that the queue can proceed:
        options.worker(items.shift(), function (err) {

            // If any task returns an error - terminate the entire queue,
            // supposing that minor errors should be handled within the
            // worker itself:
            if (err) {
                // Stop accepting items:
                options.closed = true;
                // Clear the remaining items:
                items = [];
                // Issue final callback with the error 
                options.callback(err);
                return;
            }

            // Keep track of the completed task:
            running -= 1;

            // If the queue is closed, has no more items to process and no task
            // is running, consider the queue as finished and issue the final
            // callback; otherwise, proceed to the next task immediately:
            if (options.closed && !items.length && !running) {
                options.callback();
            } else {
                work();
            }
        });
    }

    /**
     * Primary API container.
     */

    function queue() {}

    /**
     * Options function getter/setter.
     * @param [Object] newOptions Options to set.
     * @returns {Function} A copy of the current options or the queue itself.
     */

    queue.options = function (newOptions) {
        var optionName, // option name iterator
            optionsCopy = {}; // container for a copy of the "options" object

        // No arguments? Act as a getter:
        if (arguments.length === 0) {
            // Objects are passed by reference, so let's create a copy
            // of the current "options" object and return it instead of the
            // original to maintain encapsulation:
            for (optionName in options) {
                if (options.hasOwnProperty(optionName)) {
                    optionsCopy[optionName] = options[optionName];
                }
            }
            return optionsCopy;
        }

        // Got arguments? Act as a setter:
        for (optionName in newOptions) {
            if (newOptions.hasOwnProperty(optionName) &&
                    typeof queue[optionName] === 'function' &&
                    options.hasOwnProperty(optionName)) {
                queue[optionName](newOptions[optionName]);
            }
        }

        // Cascade the queue:
        return queue;
    };

    /**
     * Worker function getter/setter.
     * @param [Function] worker A worker function to set.
     * @returns {Function} Current worker or the queue.
     */

    queue.worker = function (worker) {
        if (arguments.length === 0) {
            return options.worker;
        }
        if (typeof worker === 'function') {
            options.worker = worker;
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Callback function getter/setter.
     * @param [Function] callback A callback function to set.
     * @returns {Function} Current callback or the queue.
     */

    queue.callback = function (callback) {
        if (arguments.length === 0) {
            return options.callback;
        }
        if (typeof callback === 'function') {
            options.callback = callback;
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Concurrency level getter/setter.
     * @param [Number] concurrency A concurrency level to set.
     * @returns {Number|Function} Current concurrency level or the queue.
     */

    queue.concurrency = function (concurrency) {
        if (arguments.length === 0) {
            return options.concurrency;
        }
        if (typeof concurrency === 'number') {
            options.concurrency = concurrency;
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Adds a new item to the queue.
     * @param {Function} item A new item to add to the queue.
     * @returns {Function} The queue.
     */

    queue.add = function (item) {
        // Ignore the add operation if the queue is closed:
        if (!options.closed) {
            // 
            items.push(item);
            // 
            process.nextTick(work);
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Clears the queue of any remaining items.
     * Any currently running tasks will complete regardless.
     * @returns {Function} The queue.
     */

    queue.clear = function () {
        // Clear the remaining items by resetting the "items" array:
        items = [];
        // Cascade the queue:
        return queue;
    };

    /**
     * (Re-)opens the queue.
     * @returns {Function} The queue.
     */

    queue.open = function () {
        // Remove the "closed" flag to allow new items:
        options.closed = false;
        // Restart the queue processing:
        process.nextTick(work);
        // Cascade the queue:
        return queue;
    };

    /**
     * Closes the queue.
     * @returns {Function} The queue.
     */

    queue.close = function () {
        // Set the "closed" flag to refuse new items:
        options.closed = true;
        // Cascade the queue:
        return queue;
    };

    // Return the queue while assigning it the inital options:
    return queue.options(initialOptions);
};