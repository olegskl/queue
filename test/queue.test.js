/**
 * @fileOverview Unit test suite for queue.js.
 * @license The MIT License (MIT).
 *    Copyright (c) 2012-2013 Oleg Sklyanchuk.
 *    http://opensource.org/licenses/mit-license.html
 * @author Oleg Sklyanchuk
 */

/*jslint node: true */
/*globals describe, it */

'use strict';

var assert = require('assert'),
    queue = require('../queue.js'),
    validOptions = {
        concurrency: 3,
        callback: function () {},
        worker: function (item, done) {
            done();
        }
    },
    bogusOptions = {
        foo: 'bar',
        theAnswer: 42
    };

/**
 * Checks if a value is an pure object and not an array, null, etc.
 * @param  {*}       value A value to test.
 * @return {Boolean}       Returns TRUE if and object or FALSE otherwise.
 */
function isObject(value) {
    return (Object.prototype.toString.call(value) === '[object Object]');
}


/* --------------------------- QUEUE CONSTRUCTOR ---------------------------- */


describe('queue constructor', function () {

    it('should be a function', function () {
        assert.strictEqual('function', typeof queue);
    });

    it('should return an object with no options provided', function () {
        assert(isObject(queue()));
    });

    it('should return an object if options are an empty object', function () {
        assert(isObject(queue({})));
    });

    it('should return an object with complete and valid options', function () {
        assert(isObject(queue(validOptions)));
    });

    it('should return an object with bogus options', function () {
        assert(isObject(queue(bogusOptions)));
    });

});


/* --------------------------- QUEUE INSTANCE API --------------------------- */


describe('queue instance', function () {

    describe('"options" method', function () {

        it('should be a function', function () {
            assert.strictEqual('function', typeof queue().options);
        });

        it('should return an object if called without arguments', function () {
            assert(isObject(queue(queue().options())));
        });

        it('should cascade the queue if called with arguments', function () {
            var myQueue = queue();
            assert.strictEqual(myQueue, myQueue.options(validOptions));
        });

        it('should return the same options as the ones set', function () {
            var myQueue = queue().options(validOptions),
                queueOptions = myQueue.options();
            // Would love to use assert.deepStrictEqual for strict equality
            // checking, but it doesn't exist in node 0.10.x:
            Object.keys(validOptions).forEach(function (optionKey) {
                assert.strictEqual(queueOptions[optionKey],
                    validOptions[optionKey]);
            });
        });

        it('should not return a reference to the initial object', function () {
            assert.notStrictEqual(validOptions, queue(validOptions).options());
        });

    });

    describe('"isClosed" method', function () {

        it('should be a function', function () {
            assert.strictEqual('function', typeof queue().isClosed);
        });

        it('should return FALSE after queue construction', function () {
            assert.strictEqual(false, queue().isClosed());
        });

        it('should return TRUE if queue is closed', function () {
            assert.strictEqual(true, queue().close().isClosed());
        });

        it('should return FALSE if a closed queue is reopened', function () {
            assert.strictEqual(false, queue().close().open().isClosed());
        });

    });

    describe('"close" method', function () {

        it('should be a function', function () {
            assert.strictEqual('function', typeof queue().close);
        });

        it('should set isClosed flag to TRUE', function () {
            var myQueue = queue().close();
            assert.strictEqual(true, myQueue.isClosed());
        });

        it('should result in a non-error callback', function (done) {
            var myQueue = queue().callback(done).close();
        });

    });

    describe('"open" method', function () {

        it('should be a function', function () {
            assert.strictEqual('function', typeof queue().open);
        });

        it('should set isClosed flag to FALSE', function () {
            var myQueue = queue().close().open();
            assert.strictEqual(false, myQueue.isClosed());
        });

    });

    describe('"clear" method', function () {

        it('should be a function', function () {
            assert.strictEqual('function', typeof queue().clear);
        });

        it('should remove non-running tasks', function (done) {
            var tasksCompleted = 0, // completed tasks counter
                myQueue = queue().concurrency(1) // only one task at a time
                    .worker(function (item, done) {
                        setTimeout(function () {
                            tasksCompleted += 1;
                            done();
                        }, 100);
                    }).callback(function () {
                        if (tasksCompleted > 1) {
                            throw new Error('failed');
                        }
                        done();
                    }).add(null) // this task should complete
                    .add(null); // this task should be cleared

            // Clear and close the queue while the first task is still running:
            setTimeout(function () {
                myQueue.clear().close();
            }, 50);
        });

        it('should not close the queue', function () {
            assert.strictEqual(false, queue().clear().isClosed());
        });

    });

    describe('"worker" method', function () {

        it('should be a function', function () {
            assert.strictEqual('function', typeof queue().worker);
        });

        it('should return the current worker when called with no arguments',
            function () {
                assert.strictEqual(validOptions.worker,
                    queue(validOptions).worker());
            });

        it('should be executed for every added task', function (done) {
            var tasksCompleted = 0;
            queue().callback(function () {
                if (tasksCompleted !== 3) {
                    throw new Error('Completed only ' + tasksCompleted +
                        ' out of 3.');
                }
                done();
            }).worker(function (item, done) {
                tasksCompleted += 1;
                done();
            }).add(null).add(null).add(null).close(); // three tasks to run
        });

        it('should be running in a concurrent manner', function (done) {
            var tasksRunning = 0,
                concurrency = 2;
            queue().concurrency(concurrency)
                .callback(done)
                .worker(function (item, done) {
                    tasksRunning += 1;
                    setTimeout(function () {
                        tasksRunning -= 1;
                        done();
                    }, 50);
                }).add(null).add(null).add(null) // three tasks to run
                .close();

            setTimeout(function () {
                if (tasksRunning !== concurrency) {
                    throw new Error('Running ' + tasksRunning +
                        ' tasks with concurrency ' + concurrency + '.');
                }
                done();
            }, 25);
        });

        it('should accept "item" and "done" arguments', function (done) {
            queue().callback(function () {
                done();
            }).worker(function (item, done) {
                assert.strictEqual('test', item);
                assert.strictEqual('function', typeof done);
                done();
            }).add('test').close();
        });

        it('should interrupt and close the queue on error', function (done) {
            var tasksCompleted = 0;

            queue().concurrency(1).worker(function (item, done) {
                tasksCompleted += 1;
                done('some error');
            }).callback(function (err) {
                assert.strictEqual('some error', err);
                assert.strictEqual(1, tasksCompleted);
                done();
            }).add(null).add(null);
        });

        it('should close the queue on error', function (done) {
            var myQueue = queue().concurrency(1);

            myQueue.worker(function (item, done) {
                done('some error');
            }).callback(function (err) {
                assert(myQueue.isClosed());
                done();
            }).add(null).add(null);
        });

    });

    describe('"callback" method', function () {

        it('should be a function', function () {
            assert.strictEqual('function', typeof queue().callback);
        });

        it('should return the current callback when called with no arguments',
            function () {
                assert.strictEqual(validOptions.callback,
                    queue(validOptions).callback());
            });

        it('should accept functions', function () {
            assert.strictEqual(validOptions.callback,
                queue().callback(validOptions.callback).callback());
        });

        it('should be called when all tasks are done', function (done) {
            var tasksCompleted = 0;
            queue().worker(function (item, done) {
                tasksCompleted += 1;
                done();
            }).callback(function () {
                assert.strictEqual(3, tasksCompleted);
                done();
            }).add(null).add(null).add(null).close();
        });

        it('should capture the error message', function (done) {
            queue().worker(function (item, done) {
                done('some error');
            }).callback(function (err) {
                assert.strictEqual('some error', err);
                done();
            }).add(null);
        });

    });

});