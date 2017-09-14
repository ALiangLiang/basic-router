/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var debug = require('debug')('router:route')
var flatten = require('array-flatten')
var Layer = require('./layer')

/**
 * Module variables.
 * @private
 */

var slice = Array.prototype.slice

/**
 * Expose `Route`.
 */

module.exports = Route

/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @api private
 */

function Route(path) {
  debug('new %o', path)
  this.path = path
  this.stack = []

  // route handlers for various http methods
  this.methods = {}
}

/**
 * dispatch session, res into this route
 *
 * @private
 */

Route.prototype.dispatch = function dispatch(session, res, done) {
  var idx = 0
  var stack = this.stack
  if (stack.length === 0) {
    return done()
  }

  session.route = this

  next()

  function next(err) {
    // signal to exit route
    if (err && err === 'route') {
      return done()
    }

    // signal to exit router
    if (err && err === 'router') {
      return done(err)
    }

    // no more matching layers
    if (idx >= stack.length) {
      return done(err)
    }

    var layer = stack[idx++]

    if (err) {
      layer.handle_error(err, session, res, next)
    } else {
      layer.handle_request(session, res, next)
    }
  }
}

/**
 * Add a handler for all HTTP verbs to this route.
 *
 * Behaves just like middleware and can respond or call `next`
 * to continue processing.
 *
 * You can use multiple `.all` call to add multiple handlers.
 *
 *   function check_something(session, res, next){
 *     next()
 *   }
 *
 *   function validate_user(session, res, next){
 *     next()
 *   }
 *
 *   route
 *   .all(validate_user)
 *   .all(check_something)
 *   .get(function(session, res, next){
 *     res.send('hello world')
 *   })
 *
 * @param {array|function} handler
 * @return {Route} for chaining
 * @api public
 */

Route.prototype.dialog = function(handler) {
  var callbacks = flatten(slice.call(arguments))

  if (callbacks.length === 0) {
    throw new TypeError('argument handler is required')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i]

    if (typeof fn !== 'function') {
      throw new TypeError('argument handler must be a function')
    }

    debug('%s %s', 'dialog', this.path)

    var layer = Layer('/', {}, fn)

    this.stack.push(layer)
  }

  return this
}
