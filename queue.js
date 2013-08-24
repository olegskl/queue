/**
 * @fileOverview Concurrent queue.
 * @license The MIT License (MIT).
 *    Copyright (c) 2012-2013 Oleg Sklyanchuk.
 *    http://opensource.org/licenses/mit-license.html
 * @author Oleg Sklyanchuk
 */

/*jslint node: true */

'use strict';

/**
 * The default noop function.
 * @return {Undefined}
 */
function noop() {}

/**
 * Creates a new queue.
 * @param  {Object} initialOptions Initial queue configuration.
 * @return {Object}                The created queue object.
 */
module.exports = function (initialOptions) {

    var options = {
            concurrency: 10, // task concurrency limit
            worker: noop, // worker function to run for every queue item
            callback: noop // callback to issue on queue completion
        },
        isClosed = false, // the queue is open once constructed
        tasks = [], // container of tasks to process
        running = 0, // count of currently running tasks
        queue = {}; // the main API container to be returned by this constructor

    function work() {

        // Abort when running at full capacity,
        // or if there are no tasks to process:
        if (running >= options.concurrency || !tasks.length) {
            return;
        }

        // Keep track of the number of running tasks:
        running += 1;

        // Invoke the working function by passing it as second parameter
        // a mandatory callback function that must be called upon completion
        // of a task so that the queue can proceed:
        options.worker(tasks.shift(), function (err) {

            // If any task returns an error - terminate the entire queue,
            // supposing that minor errors should be handled within the
            // worker itself:
            if (err) {
                // Stop accepting tasks:
                isClosed = true;
                // Clear the remaining tasks:
                tasks = [];
                // Issue final callback with the error:
                options.callback(err);
                return;
            }

            // Keep track of the completed task:
            running -= 1;

            // If the queue is closed, has no more tasks to process and no task
            // is running, consider the queue as finished and issue the final
            // callback; otherwise, proceed to the next task immediately:
            if (isClosed && !tasks.length && !running) {
                options.callback();
            } else {
                work();
            }
        });
    }

    /**
     * Worker function getter/setter.
     * @param   [Function]        worker A worker function to set.
     * @returns {Function|Object}        Current worker or the queue.
     */
    queue.worker = function (worker) {
        // If no arguments are provided - act as a getter:
        if (!arguments.length) {
            return options.worker;
        }
        // Ignore non-function values:
        if (typeof worker === 'function') {
            options.worker = worker;
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Callback function getter/setter.
     * @param   [Function] callback A callback function to set.
     * @returns {Function}          Current callback or the queue.
     */
    queue.callback = function (callback) {
        // If no arguments are provided - act as a getter:
        if (!arguments.length) {
            return options.callback;
        }
        // Ignore non-function values:
        if (typeof callback === 'function') {
            options.callback = callback;
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Concurrency level getter/setter.
     * @param   [Number]          concurrency A concurrency to set.
     * @returns {Number|Function}             Current concurrency or the queue.
     */
    queue.concurrency = function (concurrency) {
        // If no arguments are provided - act as a getter:
        if (!arguments.length) {
            return options.concurrency;
        }
        // Ignore non-numerical values:
        if (typeof concurrency === 'number') {
            options.concurrency = concurrency;
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Adds a new task to the queue.
     * @param   {*}      task A new task to add to the queue.
     * @returns {Object}      The queue.
     */
    queue.add = function (task) {
        // Ignore the add operation if the queue is closed:
        if (!isClosed) {
            // Push the task to the end of the queue:
            tasks.push(task);
            // Invoke the worker on the next tick:
            process.nextTick(work);
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Clears the queue of any remaining tasks.
     * Any currently running tasks will complete regardless.
     * @returns {Object} The queue.
     */
    queue.clear = function () {
        // Clear the remaining tasks by resetting the "tasks" array:
        tasks = [];
        // Cascade the queue:
        return queue;
    };

    /**
     * (Re-)opens the queue.
     * @returns {Function} The queue.
     */
    queue.open = function () {
        // Remove the "closed" flag to allow new tasks:
        isClosed = false;
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
        // Set the "closed" flag to refuse new tasks:
        isClosed = true;
        // Closing a queue with no running tasks should result in the final
        // callback being called with no error:
        if (!running && !tasks.length) {
            options.callback();
        }
        // Cascade the queue:
        return queue;
    };

    /**
     * Tells if the queue is closed.
     * @returns {Boolean} TRUE if closed, FALSE of open.
     */
    queue.isClosed = function () {
        return isClosed;
    };

    /**
     * Options getter/setter.
     * @param  {Object} newOptions An object of options.
     * @return {Object}            Current settings or the queue.
     */
    queue.options = function (newOptions) {

        var optionKey,
            optionsCopy = {};

        // If no arguments are provided - act as a getter:
        if (!arguments.length) {
            // Ensure encapsulation by returning a shallow copy of the options:
            for (optionKey in options) {
                if (options.hasOwnProperty(optionKey)) {
                    optionsCopy[optionKey] = options[optionKey];
                }
            }
            return optionsCopy;
        }

        for (optionKey in options) {
            if (options.hasOwnProperty(optionKey) &&
                    newOptions.hasOwnProperty(optionKey)) {
                queue[optionKey](newOptions[optionKey]);
            }
        }

        // Cascade the queue:
        return queue;
    };

    // Return the queue after assigning to it the inital options:
    return (arguments.length)
        ? queue.options(initialOptions)
        : queue;
};