/**
 * Module defining a simple interface for setting and getting context objects on a domain.
 * A connect middleware allows wrapping requests in a domain and setting/getting values
 * on the active domain object.
 * @module {Object} request-context
 * @requires domain
 */
'use strict';

var domain = require('domain');

/**
 * The ContextService provides the middleware and context accessor methods
 * @type {Object}
 */
exports = module.exports = {

	/**
	 * Wrap the request/response loop in a namespace wrapper (by using node's domain system).
	 * All following functions will be run in the created namespace. Returns a function
	 * function that can be used as connect middleware.
	 * @type {Function}
 	 * @params {String} name - The name of the namespace to create
	 * 
	 */
    middleware: contextMiddleware,

	/**
	 * Set the context for a given name or path.
	 * @param {String} name - The name of the context
	 * @param {*} value - The value to set
	 */
    setContext: setContext,

	/**
	 * Alias for the setContext method.
	 * @param {String} name - The name of the context
	 * @param {*} value - The value to set
	 */
    set: setContext,

	/**
	 * Return the context or a context variable for a name or path.
	 * @param {String} name - The name or path of the context or context property to retrieve
	 * @returns {undefined|*} The context for the given specifier or null if no such name could be found
	 */
    getContext: getContext,

	/**
	 * Alias for the getContext method.
	 * @param {String} name - The name or path of the context or context property to retrieve
	 * @returns {undefined|*} The context for the given specifier or null if no such name could be found
	 */

    get: getContext,
};

/**
 * Return the context for a name.
 * @api private
 * @param {String} name - The name of the context to retrieve
 * @param {domain} [current] - A domain object to retrieve the context object from
 * @returns {*} The context for the given name
 */
function getContext(name, current) {
    var context = getCurrent(current);
    if (!context) {
        return undefined;
    }

    return getPropertyForPath(context, name);
}

/**
 * Set the context for a given name
 * @api private
 * @param {String} name - The name of the context
 * @param {*} value - The value to set
 * @param {domain} [current] - A domain object to retrieve the context object from
 * @throws Error
 */
function setContext(name, value, current) {
    var context = getCurrent(current);
    if (!context) {
        throw new Error('No active context found to set property ' + name);
    }

    setPropertyForPath(context, name, value);
}

/**
 * Wrap the request/response loop in a namespace wrapper (by using node's domain system).
 * @api private
 * @param {String} namespace - The name of the namespace to create
 * @returns {Function} A function that can be used as request middleware. Following functions
 * will be run in the created namespace.
 */
function contextMiddleware(namespace) {
    if (!namespace) {
        throw new Error('No namespace specified!');
    }

    return function runInContextMiddleware(req, res, next) {
        // We want multiple request-context consumers to use the same domain
        // context object rather than creating a bunch of nested domains.
        // Their namespaces should be sufficient to keep each consumer's
        // data separate from the others.
        //if (domain.active && domain.active.__$cntxt__) {
        //    setContext(namespace, Object.create(null), domain.active);
        //    next();
        //    return;
        //}

        var d = domain.create();
        d.add(req);
        d.add(res);
        d.on('error', handleError);

        setContext(namespace, Object.create(null), d);

        d.run(next);

        function handleError(err) {
            res.setHeader('Connection', 'close');
            next(err);
        }
    };
}

/**
 * Get the current active domain context object
 * @api private
 * @param {domain} [current] - A domain object the context container should be looked upon
 * @returns {null|Object}
 */
function getCurrent(current) {
    if (!current) {
        current = domain.active;
    }

    // no active domain found
    if (!current) {
        return null;
    }

    // get/set the internal context store from/on the active domain object
    current.__$cntxt__ = current.__$cntxt__ || Object.create(null);
    return current.__$cntxt__;
}

/**
 * Get the object property for a given path divided by dots
 * @api private
 * @param {Object} obj - The object to query
 * @param {String} path - The objects property path divided by dots
 * @returns {*}
 */
function getPropertyForPath(obj, path) {
    if (obj && path) {
        var arr = normalizePathArray(path);

        while (arr.length) {
            if (!(obj = obj[arr.shift()])) {
                break;
            }
        }
    }
    return obj;
}

/**
 * Set the object property for a given path divided by dots
 * @api private
 * @param {Object} obj - The object to modify
 * @param {String} path - The objects property path divided by dots
 * @param {*} value - The value to set on the objects path
 * @returns {*}
 */
function setPropertyForPath(obj, path, value) {
    var arr = normalizePathArray(path);
    var len = arr.length - 1;

    for (var i = 0; i < len; i += 1) {
        if (typeof obj[arr[i]] === 'undefined') {
            // create a new object container for undefined paths
            obj[arr[i]] = {};
        }
        obj = obj[arr[i]];
    }

    obj[arr[len]] = value;
}

/**
 * Normalize the namespace of a path by replacing all ':' to '.'.
 * @api private
 * @param {String} path - The context object property path divided by dots
 * @returns {*}
 */
function normalizePathArray(path) {
    return path.replace(':', '.').split('.');
}
