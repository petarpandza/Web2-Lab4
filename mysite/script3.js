/*!
 * Core functionality for Snowplow Browser trackers v3.14.0 (http://bit.ly/sp-js)
 * Copyright 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * Licensed under BSD-3-Clause
 */

import { LOG, trackerCore, buildPageView, buildPagePing } from '@snowplow/tracker-core';
import { __assign } from 'tslib';
import hash from 'sha1';
import { v4 } from 'uuid';

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Attempt to get a value from localStorage
 *
 * @param string - key
 * @returns string The value obtained from localStorage, or
 *                undefined if localStorage is inaccessible
 */
function attemptGetLocalStorage(key) {
    try {
        var localStorageAlias = window.localStorage, exp = localStorageAlias.getItem(key + '.expires');
        if (exp === null || +exp > Date.now()) {
            return localStorageAlias.getItem(key);
        }
        else {
            localStorageAlias.removeItem(key);
            localStorageAlias.removeItem(key + '.expires');
        }
        return undefined;
    }
    catch (e) {
        return undefined;
    }
}
/**
 * Attempt to write a value to localStorage
 *
 * @param string - key
 * @param string - value
 * @param number - ttl Time to live in seconds, defaults to 2 years from Date.now()
 * @returns boolean Whether the operation succeeded
 */
function attemptWriteLocalStorage(key, value, ttl) {
    if (ttl === void 0) { ttl = 63072000; }
    try {
        var localStorageAlias = window.localStorage, t = Date.now() + ttl * 1000;
        localStorageAlias.setItem("".concat(key, ".expires"), t.toString());
        localStorageAlias.setItem(key, value);
        return true;
    }
    catch (e) {
        return false;
    }
}
/**
 * Attempt to delete a value from localStorage
 *
 * @param string - key
 * @returns boolean Whether the operation succeeded
 */
function attemptDeleteLocalStorage(key) {
    try {
        var localStorageAlias = window.localStorage;
        localStorageAlias.removeItem(key);
        localStorageAlias.removeItem(key + '.expires');
        return true;
    }
    catch (e) {
        return false;
    }
}
/**
 * Attempt to get a value from sessionStorage
 *
 * @param string - key
 * @returns string The value obtained from sessionStorage, or
 *                undefined if sessionStorage is inaccessible
 */
function attemptGetSessionStorage(key) {
    try {
        return window.sessionStorage.getItem(key);
    }
    catch (e) {
        return undefined;
    }
}
/**
 * Attempt to write a value to sessionStorage
 *
 * @param string - key
 * @param string - value
 * @returns boolean Whether the operation succeeded
 */
function attemptWriteSessionStorage(key, value) {
    try {
        window.sessionStorage.setItem(key, value);
        return true;
    }
    catch (e) {
        return false;
    }
}

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Checks if an object is a string
 * @param str - The object to check
 */
function isString(str) {
    if (str && typeof str.valueOf() === 'string') {
        return true;
    }
    return false;
}
/**
 * Checks if an object is an integer
 * @param int - The object to check
 */
function isInteger(int) {
    return ((Number.isInteger && Number.isInteger(int)) || (typeof int === 'number' && isFinite(int) && Math.floor(int) === int));
}
/**
 * Checks if the input parameter is a function
 * @param func - The object to check
 */
function isFunction(func) {
    if (func && typeof func === 'function') {
        return true;
    }
    return false;
}
/**
 * Cleans up the page title
 */
function fixupTitle(title) {
    if (!isString(title)) {
        title = title.text || '';
        var tmp = document.getElementsByTagName('title');
        if (tmp && tmp[0] != null) {
            title = tmp[0].text;
        }
    }
    return title;
}
/**
 * Extract hostname from URL
 */
function getHostName(url) {
    // scheme : // [username [: password] @] hostname [: port] [/ [path] [? query] [# fragment]]
    var e = new RegExp('^(?:(?:https?|ftp):)/*(?:[^@]+@)?([^:/#]+)'), matches = e.exec(url);
    return matches ? matches[1] : url;
}
/**
 * Fix-up domain
 */
function fixupDomain(domain) {
    var dl = domain.length;
    // remove trailing '.'
    if (domain.charAt(--dl) === '.') {
        domain = domain.slice(0, dl);
    }
    // remove leading '*'
    if (domain.slice(0, 2) === '*.') {
        domain = domain.slice(1);
    }
    return domain;
}
/**
 * Get page referrer. In the case of a single-page app,
 * if the URL changes without the page reloading, pass
 * in the old URL. It will be returned unless overriden
 * by a "refer(r)er" parameter in the querystring.
 *
 * @param string - oldLocation Optional.
 * @returns string The referrer
 */
function getReferrer(oldLocation) {
    var windowAlias = window, fromQs = fromQuerystring('referrer', windowAlias.location.href) || fromQuerystring('referer', windowAlias.location.href);
    // Short-circuit
    if (fromQs) {
        return fromQs;
    }
    // In the case of a single-page app, return the old URL
    if (oldLocation) {
        return oldLocation;
    }
    try {
        if (windowAlias.top) {
            return windowAlias.top.document.referrer;
        }
        else if (windowAlias.parent) {
            return windowAlias.parent.document.referrer;
        }
    }
    catch (_a) { }
    return document.referrer;
}
/**
 * Cross-browser helper function to add event handler
 */
function addEventListener(element, eventType, eventHandler, options) {
    if (element.addEventListener) {
        element.addEventListener(eventType, eventHandler, options);
        return true;
    }
    // IE Support
    if (element.attachEvent) {
        return element.attachEvent('on' + eventType, eventHandler);
    }
    element['on' + eventType] = eventHandler;
}
/**
 * Return value from name-value pair in querystring
 */
function fromQuerystring(field, url) {
    var match = new RegExp('^[^#]*[?&]' + field + '=([^&#]*)').exec(url);
    if (!match) {
        return null;
    }
    return decodeURIComponent(match[1].replace(/\+/g, ' '));
}
/**
 * Add a name-value pair to the querystring of a URL
 *
 * @param string - url URL to decorate
 * @param string - name Name of the querystring pair
 * @param string - value Value of the querystring pair
 */
function decorateQuerystring(url, name, value) {
    var initialQsParams = name + '=' + value;
    var hashSplit = url.split('#');
    var qsSplit = hashSplit[0].split('?');
    var beforeQuerystring = qsSplit.shift();
    // Necessary because a querystring may contain multiple question marks
    var querystring = qsSplit.join('?');
    if (!querystring) {
        querystring = initialQsParams;
    }
    else {
        // Whether this is the first time the link has been decorated
        var initialDecoration = true;
        var qsFields = querystring.split('&');
        for (var i = 0; i < qsFields.length; i++) {
            if (qsFields[i].substr(0, name.length + 1) === name + '=') {
                initialDecoration = false;
                qsFields[i] = initialQsParams;
                querystring = qsFields.join('&');
                break;
            }
        }
        if (initialDecoration) {
            querystring = initialQsParams + '&' + querystring;
        }
    }
    hashSplit[0] = beforeQuerystring + '?' + querystring;
    return hashSplit.join('#');
}
/**
 * Finds the root domain
 */
function findRootDomain(sameSite, secure) {
    var windowLocationHostnameAlias = window.location.hostname, cookiePrefix = '_sp_root_domain_test_', cookieName = cookiePrefix + new Date().getTime(), cookieValue = '_test_value_' + new Date().getTime();
    var locationParts = windowLocationHostnameAlias.split('.');
    for (var idx = locationParts.length - 2; idx >= 0; idx--) {
        var currentDomain = locationParts.slice(idx).join('.');
        cookie(cookieName, cookieValue, 0, '/', currentDomain, sameSite, secure);
        if (cookie(cookieName) === cookieValue) {
            // Clean up created cookie(s)
            deleteCookie(cookieName, currentDomain, sameSite, secure);
            var cookieNames = getCookiesWithPrefix(cookiePrefix);
            for (var i = 0; i < cookieNames.length; i++) {
                deleteCookie(cookieNames[i], currentDomain, sameSite, secure);
            }
            return currentDomain;
        }
    }
    // Cookies cannot be read
    return windowLocationHostnameAlias;
}
/**
 * Checks whether a value is present within an array
 *
 * @param val - The value to check for
 * @param array - The array to check within
 * @returns boolean Whether it exists
 */
function isValueInArray(val, array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === val) {
            return true;
        }
    }
    return false;
}
/**
 * Deletes an arbitrary cookie by setting the expiration date to the past
 *
 * @param cookieName - The name of the cookie to delete
 * @param domainName - The domain the cookie is in
 */
function deleteCookie(cookieName, domainName, sameSite, secure) {
    cookie(cookieName, '', -1, '/', domainName, sameSite, secure);
}
/**
 * Fetches the name of all cookies beginning with a certain prefix
 *
 * @param cookiePrefix - The prefix to check for
 * @returns array The cookies that begin with the prefix
 */
function getCookiesWithPrefix(cookiePrefix) {
    var cookies = document.cookie.split('; ');
    var cookieNames = [];
    for (var i = 0; i < cookies.length; i++) {
        if (cookies[i].substring(0, cookiePrefix.length) === cookiePrefix) {
            cookieNames.push(cookies[i]);
        }
    }
    return cookieNames;
}
/**
 * Get and set the cookies associated with the current document in browser
 * This implementation always returns a string, returns the cookie value if only name is specified
 *
 * @param name - The cookie name (required)
 * @param value - The cookie value
 * @param ttl - The cookie Time To Live (seconds)
 * @param path - The cookies path
 * @param domain - The cookies domain
 * @param samesite - The cookies samesite attribute
 * @param secure - Boolean to specify if cookie should be secure
 * @returns string The cookies value
 */
function cookie(name, value, ttl, path, domain, samesite, secure) {
    if (arguments.length > 1) {
        return (document.cookie =
            name +
            '=' +
            encodeURIComponent(value !== null && value !== void 0 ? value : '') +
            (ttl ? '; Expires=' + new Date(+new Date() + ttl * 1000).toUTCString() : '') +
            (path ? '; Path=' + path : '') +
            (domain ? '; Domain=' + domain : '') +
            (samesite ? '; SameSite=' + samesite : '') +
            (secure ? '; Secure' : ''));
    }
    return decodeURIComponent((('; ' + document.cookie).split('; ' + name + '=')[1] || '').split(';')[0]);
}
/**
 * Parses an object and returns either the
 * integer or undefined.
 *
 * @param obj - The object to parse
 * @returns the result of the parse operation
 */
function parseAndValidateInt(obj) {
    var result = parseInt(obj);
    return isNaN(result) ? undefined : result;
}
/**
 * Parses an object and returns either the
 * number or undefined.
 *
 * @param obj - The object to parse
 * @returns the result of the parse operation
 */
function parseAndValidateFloat(obj) {
    var result = parseFloat(obj);
    return isNaN(result) ? undefined : result;
}
/**
 * Convert a criterion object to a filter function
 *
 * @param object - criterion Either {allowlist: [array of allowable strings]}
 *                             or {denylist: [array of allowable strings]}
 *                             or {filter: function (elt) {return whether to track the element}
 * @param boolean - byClass Whether to allowlist/denylist based on an element's classes (for forms)
 *                        or name attribute (for fields)
 */
function getFilterByClass(criterion) {
    // If the criterion argument is not an object, add listeners to all elements
    if (criterion == null || typeof criterion !== 'object' || Array.isArray(criterion)) {
        return function () {
            return true;
        };
    }
    var inclusive = Object.prototype.hasOwnProperty.call(criterion, 'allowlist');
    var specifiedClassesSet = getSpecifiedClassesSet(criterion);
    return getFilter(criterion, function (elt) {
        return checkClass(elt, specifiedClassesSet) === inclusive;
    });
}
/**
 * Convert a criterion object to a filter function
 *
 * @param object - criterion Either {allowlist: [array of allowable strings]}
 *                             or {denylist: [array of allowable strings]}
 *                             or {filter: function (elt) {return whether to track the element}
 */
function getFilterByName(criterion) {
    // If the criterion argument is not an object, add listeners to all elements
    if (criterion == null || typeof criterion !== 'object' || Array.isArray(criterion)) {
        return function () {
            return true;
        };
    }
    var inclusive = criterion.hasOwnProperty('allowlist');
    var specifiedClassesSet = getSpecifiedClassesSet(criterion);
    return getFilter(criterion, function (elt) {
        return elt.name in specifiedClassesSet === inclusive;
    });
}
/**
 * List the classes of a DOM element without using elt.classList (for compatibility with IE 9)
 */
function getCssClasses(elt) {
    return elt.className.match(/\S+/g) || [];
}
/**
 * Check whether an element has at least one class from a given list
 */
function checkClass(elt, classList) {
    var classes = getCssClasses(elt);
    for (var _i = 0, classes_1 = classes; _i < classes_1.length; _i++) {
        var className = classes_1[_i];
        if (classList[className]) {
            return true;
        }
    }
    return false;
}
function getFilter(criterion, fallbackFilter) {
    if (criterion.hasOwnProperty('filter') && criterion.filter) {
        return criterion.filter;
    }
    return fallbackFilter;
}
function getSpecifiedClassesSet(criterion) {
    // Convert the array of classes to an object of the form {class1: true, class2: true, ...}
    var specifiedClassesSet = {};
    var specifiedClasses = criterion.allowlist || criterion.denylist;
    if (specifiedClasses) {
        if (!Array.isArray(specifiedClasses)) {
            specifiedClasses = [specifiedClasses];
        }
        for (var i = 0; i < specifiedClasses.length; i++) {
            specifiedClassesSet[specifiedClasses[i]] = true;
        }
    }
    return specifiedClassesSet;
}

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/*
 * Checks whether sessionStorage is available, in a way that
 * does not throw a SecurityError in Firefox if "always ask"
 * is enabled for cookies (https://github.com/snowplow/snowplow/issues/163).
 */
function hasSessionStorage() {
    try {
        return !!window.sessionStorage;
    }
    catch (e) {
        return true; // SecurityError when referencing it means it exists
    }
}
/*
 * Checks whether localStorage is available, in a way that
 * does not throw a SecurityError in Firefox if "always ask"
 * is enabled for cookies (https://github.com/snowplow/snowplow/issues/163).
 */
function hasLocalStorage() {
    try {
        return !!window.localStorage;
    }
    catch (e) {
        return true; // SecurityError when referencing it means it exists
    }
}
/*
 * Checks whether localStorage is accessible
 * sets and removes an item to handle private IOS5 browsing
 * (http://git.io/jFB2Xw)
 */
function localStorageAccessible() {
    var mod = 'modernizr';
    if (!hasLocalStorage()) {
        return false;
    }
    try {
        var ls = window.localStorage;
        ls.setItem(mod, mod);
        ls.removeItem(mod);
        return true;
    }
    catch (e) {
        return false;
    }
}

var WEB_PAGE_SCHEMA = 'iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0';
var BROWSER_CONTEXT_SCHEMA = 'iglu:com.snowplowanalytics.snowplow/browser_context/jsonschema/1-0-0';
var CLIENT_SESSION_SCHEMA = 'iglu:com.snowplowanalytics.snowplow/client_session/jsonschema/1-0-2';
var PAYLOAD_DATA_SCHEMA = 'iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4';

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Object handling sending events to a collector.
 * Instantiated once per tracker instance.
 *
 * @param id - The Snowplow function name (used to generate the localStorage key)
 * @param sharedSate - Stores reference to the outbound queue so it can unload the page when all queues are empty
 * @param useLocalStorage - Whether to use localStorage at all
 * @param eventMethod - if null will use 'beacon' otherwise can be set to 'post', 'get', or 'beacon' to force.
 * @param postPath - The path where events are to be posted
 * @param bufferSize - How many events to batch in localStorage before sending them all
 * @param maxPostBytes - Maximum combined size in bytes of the event JSONs in a POST request
 * @param maxGetBytes - Maximum size in bytes of the complete event URL string in a GET request. 0 for no limit.
 * @param useStm - Whether to add timestamp to events
 * @param maxLocalStorageQueueSize - Maximum number of queued events we will attempt to store in local storage
 * @param connectionTimeout - Defines how long to wait before aborting the request
 * @param anonymousTracking - Defines whether to set the SP-Anonymous header for anonymous tracking on GET and POST
 * @param customHeaders - Allows custom headers to be defined and passed on XMLHttpRequest requests
 * @param withCredentials - Sets the value of the withCredentials flag on XMLHttpRequest (GET and POST) requests
 * @param retryStatusCodes – Failure HTTP response status codes from Collector for which sending events should be retried (they can override the `dontRetryStatusCodes`)
 * @param dontRetryStatusCodes – Failure HTTP response status codes from Collector for which sending events should not be retried
 * @returns object OutQueueManager instance
 */
function OutQueueManager(id, sharedSate, useLocalStorage, eventMethod, postPath, bufferSize, maxPostBytes, maxGetBytes, useStm, maxLocalStorageQueueSize, connectionTimeout, anonymousTracking, customHeaders, withCredentials, retryStatusCodes, dontRetryStatusCodes) {
    var executingQueue = false, configCollectorUrl, outQueue = [];
    //Force to lower case if its a string
    eventMethod = typeof eventMethod === 'string' ? eventMethod.toLowerCase() : eventMethod;
    // Use the Beacon API if eventMethod is set true, 'true', or 'beacon'.
    var isBeaconRequested = eventMethod === true || eventMethod === 'beacon' || eventMethod === 'true',
        // Fall back to POST or GET for browsers which don't support Beacon API
        isBeaconAvailable = Boolean(isBeaconRequested &&
            window.navigator &&
            window.navigator.sendBeacon &&
            !hasWebKitBeaconBug(window.navigator.userAgent)), useBeacon = isBeaconAvailable && isBeaconRequested,
        // Use GET if specified
        isGetRequested = eventMethod === 'get',
        // Don't use XhrHttpRequest for browsers which don't support CORS XMLHttpRequests (e.g. IE <= 9)
        useXhr = Boolean(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()),
        // Use POST if specified
        usePost = !isGetRequested && useXhr && (eventMethod === 'post' || isBeaconRequested),
        // Resolve all options and capabilities and decide path
        path = usePost ? postPath : '/i',
        // Different queue names for GET and POST since they are stored differently
        queueName = "snowplowOutQueue_".concat(id, "_").concat(usePost ? 'post2' : 'get');
    // Ensure we don't set headers when beacon is the requested eventMethod as we might fallback to POST
    // and end up sending them in older browsers which don't support beacon leading to inconsistencies
    if (isBeaconRequested)
        customHeaders = {};
    // Get buffer size or set 1 if unable to buffer
    bufferSize = (useLocalStorage && localStorageAccessible() && usePost && bufferSize) || 1;
    if (useLocalStorage) {
        // Catch any JSON parse errors or localStorage that might be thrown
        try {
            var localStorageQueue = window.localStorage.getItem(queueName);
            outQueue = localStorageQueue ? JSON.parse(localStorageQueue) : [];
        }
        catch (e) { }
    }
    // Initialize to and empty array if we didn't get anything out of localStorage
    if (!Array.isArray(outQueue)) {
        outQueue = [];
    }
    // Used by pageUnloadGuard
    sharedSate.outQueues.push(outQueue);
    if (useXhr && bufferSize > 1) {
        sharedSate.bufferFlushers.push(function (sync) {
            if (!executingQueue) {
                executeQueue(sync);
            }
        });
    }
    /*
     * Convert a dictionary to a querystring
     * The context field is the last in the querystring
     */
    function getQuerystring(request) {
        var querystring = '?', lowPriorityKeys = { co: true, cx: true }, firstPair = true;
        for (var key in request) {
            if (request.hasOwnProperty(key) && !lowPriorityKeys.hasOwnProperty(key)) {
                if (!firstPair) {
                    querystring += '&';
                }
                else {
                    firstPair = false;
                }
                querystring += encodeURIComponent(key) + '=' + encodeURIComponent(request[key]);
            }
        }
        for (var contextKey in lowPriorityKeys) {
            if (request.hasOwnProperty(contextKey) && lowPriorityKeys.hasOwnProperty(contextKey)) {
                querystring += '&' + contextKey + '=' + encodeURIComponent(request[contextKey]);
            }
        }
        return querystring;
    }
    /*
     * Convert numeric fields to strings to match payload_data schema
     */
    function getBody(request) {
        var cleanedRequest = Object.keys(request)
            .map(function (k) { return [k, request[k]]; })
            .reduce(function (acc, _a) {
                var key = _a[0], value = _a[1];
                acc[key] = value.toString();
                return acc;
            }, {});
        return {
            evt: cleanedRequest,
            bytes: getUTF8Length(JSON.stringify(cleanedRequest))
        };
    }
    /**
     * Count the number of bytes a string will occupy when UTF-8 encoded
     * Taken from http://stackoverflow.com/questions/2848462/count-bytes-in-textarea-using-javascript/
     *
     * @param string - s
     * @returns number Length of s in bytes when UTF-8 encoded
     */
    function getUTF8Length(s) {
        var len = 0;
        for (var i = 0; i < s.length; i++) {
            var code = s.charCodeAt(i);
            if (code <= 0x7f) {
                len += 1;
            }
            else if (code <= 0x7ff) {
                len += 2;
            }
            else if (code >= 0xd800 && code <= 0xdfff) {
                // Surrogate pair: These take 4 bytes in UTF-8 and 2 chars in UCS-2
                // (Assume next char is the other [valid] half and just skip it)
                len += 4;
                i++;
            }
            else if (code < 0xffff) {
                len += 3;
            }
            else {
                len += 4;
            }
        }
        return len;
    }
    var postable = function (queue) {
        return typeof queue[0] === 'object';
    };
    /**
     * Send event as POST request right away without going to queue. Used when the request surpasses maxGetBytes or maxPostBytes
     * @param body POST request body
     * @param configCollectorUrl full collector URL with path
     */
    function sendPostRequestWithoutQueueing(body, configCollectorUrl) {
        var xhr = initializeXMLHttpRequest(configCollectorUrl, true, false);
        xhr.send(encloseInPayloadDataEnvelope(attachStmToEvent([body.evt])));
    }
    /*
     * Queue for submission to the collector and start processing queue
     */
    function enqueueRequest(request, url) {
        configCollectorUrl = url + path;
        var eventTooBigWarning = function (bytes, maxBytes) {
            return LOG.warn('Event (' + bytes + 'B) too big, max is ' + maxBytes);
        };
        if (usePost) {
            var body = getBody(request);
            if (body.bytes >= maxPostBytes) {
                eventTooBigWarning(body.bytes, maxPostBytes);
                sendPostRequestWithoutQueueing(body, configCollectorUrl);
                return;
            }
            else {
                outQueue.push(body);
            }
        }
        else {
            var querystring = getQuerystring(request);
            if (maxGetBytes > 0) {
                var requestUrl = createGetUrl(querystring);
                var bytes = getUTF8Length(requestUrl);
                if (bytes >= maxGetBytes) {
                    eventTooBigWarning(bytes, maxGetBytes);
                    if (useXhr) {
                        var body = getBody(request);
                        var postUrl = url + postPath;
                        sendPostRequestWithoutQueueing(body, postUrl);
                    }
                    return;
                }
            }
            outQueue.push(querystring);
        }
        var savedToLocalStorage = false;
        if (useLocalStorage) {
            savedToLocalStorage = attemptWriteLocalStorage(queueName, JSON.stringify(outQueue.slice(0, maxLocalStorageQueueSize)));
        }
        // If we're not processing the queue, we'll start.
        if (!executingQueue && (!savedToLocalStorage || outQueue.length >= bufferSize)) {
            executeQueue();
        }
    }
    /*
     * Run through the queue of requests, sending them one at a time.
     * Stops processing when we run out of queued requests, or we get an error.
     */
    function executeQueue(sync) {
        if (sync === void 0) { sync = false; }
        // Failsafe in case there is some way for a bad value like "null" to end up in the outQueue
        while (outQueue.length && typeof outQueue[0] !== 'string' && typeof outQueue[0] !== 'object') {
            outQueue.shift();
        }
        if (outQueue.length < 1) {
            executingQueue = false;
            return;
        }
        // Let's check that we have a URL
        if (!isString(configCollectorUrl)) {
            throw 'No collector configured';
        }
        executingQueue = true;
        if (useXhr) {
            // Keep track of number of events to delete from queue
            var chooseHowManyToSend = function (queue) {
                var numberToSend = 0, byteCount = 0;
                while (numberToSend < queue.length) {
                    byteCount += queue[numberToSend].bytes;
                    if (byteCount >= maxPostBytes) {
                        break;
                    }
                    else {
                        numberToSend += 1;
                    }
                }
                return numberToSend;
            };
            var url = void 0, xhr_1, numberToSend_1;
            if (postable(outQueue)) {
                url = configCollectorUrl;
                xhr_1 = initializeXMLHttpRequest(url, true, sync);
                numberToSend_1 = chooseHowManyToSend(outQueue);
            }
            else {
                url = createGetUrl(outQueue[0]);
                xhr_1 = initializeXMLHttpRequest(url, false, sync);
                numberToSend_1 = 1;
            }
            // Time out POST requests after connectionTimeout
            var xhrTimeout_1 = setTimeout(function () {
                xhr_1.abort();
                executingQueue = false;
            }, connectionTimeout);
            var removeEventsFromQueue_1 = function (numberToSend) {
                for (var deleteCount = 0; deleteCount < numberToSend; deleteCount++) {
                    outQueue.shift();
                }
                if (useLocalStorage) {
                    attemptWriteLocalStorage(queueName, JSON.stringify(outQueue.slice(0, maxLocalStorageQueueSize)));
                }
            };
            // The events (`numberToSend` of them), have been sent, so we remove them from the outQueue
            // We also call executeQueue() again, to let executeQueue() check if we should keep running through the queue
            var onPostSuccess_1 = function (numberToSend) {
                removeEventsFromQueue_1(numberToSend);
                executeQueue();
            };
            xhr_1.onreadystatechange = function () {
                if (xhr_1.readyState === 4 && xhr_1.status >= 200) {
                    clearTimeout(xhrTimeout_1);
                    if (xhr_1.status < 300) {
                        onPostSuccess_1(numberToSend_1);
                    }
                    else {
                        if (!shouldRetryForStatusCode(xhr_1.status)) {
                            LOG.error("Status ".concat(xhr_1.status, ", will not retry."));
                            removeEventsFromQueue_1(numberToSend_1);
                        }
                        executingQueue = false;
                    }
                }
            };
            if (!postable(outQueue)) {
                // If not postable then it's a GET so just send it
                xhr_1.send();
            }
            else {
                var batch = outQueue.slice(0, numberToSend_1);
                if (batch.length > 0) {
                    var beaconStatus = false;
                    var eventBatch = batch.map(function (x) {
                        return x.evt;
                    });
                    if (useBeacon) {
                        var blob = new Blob([encloseInPayloadDataEnvelope(attachStmToEvent(eventBatch))], {
                            type: 'application/json'
                        });
                        try {
                            beaconStatus = navigator.sendBeacon(url, blob);
                        }
                        catch (error) {
                            beaconStatus = false;
                        }
                    }
                    // When beaconStatus is true, we can't _guarantee_ that it was successful (beacon queues asynchronously)
                    // but the browser has taken it out of our hands, so we want to flush the queue assuming it will do its job
                    if (beaconStatus === true) {
                        onPostSuccess_1(numberToSend_1);
                    }
                    else {
                        xhr_1.send(encloseInPayloadDataEnvelope(attachStmToEvent(eventBatch)));
                    }
                }
            }
        }
        else if (!anonymousTracking && !postable(outQueue)) {
            // We can't send with this technique if anonymous tracking is on as we can't attach the header
            var image = new Image(1, 1), loading_1 = true;
            image.onload = function () {
                if (!loading_1)
                    return;
                loading_1 = false;
                outQueue.shift();
                if (useLocalStorage) {
                    attemptWriteLocalStorage(queueName, JSON.stringify(outQueue.slice(0, maxLocalStorageQueueSize)));
                }
                executeQueue();
            };
            image.onerror = function () {
                if (!loading_1)
                    return;
                loading_1 = false;
                executingQueue = false;
            };
            image.src = createGetUrl(outQueue[0]);
            setTimeout(function () {
                if (loading_1 && executingQueue) {
                    loading_1 = false;
                    executeQueue();
                }
            }, connectionTimeout);
        }
        else {
            executingQueue = false;
        }
    }
    function shouldRetryForStatusCode(statusCode) {
        // success, don't retry
        if (statusCode >= 200 && statusCode < 300) {
            return false;
        }
        // retry if status code among custom user-supplied retry codes
        if (retryStatusCodes.includes(statusCode)) {
            return true;
        }
        // retry if status code *not* among the don't retry codes
        return !dontRetryStatusCodes.includes(statusCode);
    }
    /**
     * Open an XMLHttpRequest for a given endpoint with the correct credentials and header
     *
     * @param string - url The destination URL
     * @returns object The XMLHttpRequest
     */
    function initializeXMLHttpRequest(url, post, sync) {
        var xhr = new XMLHttpRequest();
        if (post) {
            xhr.open('POST', url, !sync);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        }
        else {
            xhr.open('GET', url, !sync);
        }
        xhr.withCredentials = withCredentials;
        if (anonymousTracking) {
            xhr.setRequestHeader('SP-Anonymous', '*');
        }
        for (var header in customHeaders) {
            if (Object.prototype.hasOwnProperty.call(customHeaders, header)) {
                xhr.setRequestHeader(header, customHeaders[header]);
            }
        }
        return xhr;
    }
    /**
     * Enclose an array of events in a self-describing payload_data JSON string
     *
     * @param array - events Batch of events
     * @returns string payload_data self-describing JSON
     */
    function encloseInPayloadDataEnvelope(events) {
        return JSON.stringify({
            schema: PAYLOAD_DATA_SCHEMA,
            data: events
        });
    }
    /**
     * Attaches the STM field to outbound POST events.
     *
     * @param events - the events to attach the STM to
     */
    function attachStmToEvent(events) {
        var stm = new Date().getTime().toString();
        for (var i = 0; i < events.length; i++) {
            events[i]['stm'] = stm;
        }
        return events;
    }
    /**
     * Creates the full URL for sending the GET request. Will append `stm` if enabled
     *
     * @param nextRequest - the query string of the next request
     */
    function createGetUrl(nextRequest) {
        if (useStm) {
            return configCollectorUrl + nextRequest.replace('?', '?stm=' + new Date().getTime() + '&');
        }
        return configCollectorUrl + nextRequest;
    }
    return {
        enqueueRequest: enqueueRequest,
        executeQueue: function () {
            if (!executingQueue) {
                executeQueue();
            }
        },
        setUseLocalStorage: function (localStorage) {
            useLocalStorage = localStorage;
        },
        setAnonymousTracking: function (anonymous) {
            anonymousTracking = anonymous;
        },
        setCollectorUrl: function (url) {
            configCollectorUrl = url + path;
        },
        setBufferSize: function (newBufferSize) {
            bufferSize = newBufferSize;
        }
    };
    function hasWebKitBeaconBug(useragent) {
        return (isIosVersionLessThanOrEqualTo(13, useragent) ||
            (isMacosxVersionLessThanOrEqualTo(10, 15, useragent) && isSafari(useragent)));
        function isIosVersionLessThanOrEqualTo(major, useragent) {
            var match = useragent.match('(iP.+; CPU .*OS (d+)[_d]*.*) AppleWebKit/');
            if (match && match.length) {
                return parseInt(match[0]) <= major;
            }
            return false;
        }
        function isMacosxVersionLessThanOrEqualTo(major, minor, useragent) {
            var match = useragent.match('(Macintosh;.*Mac OS X (d+)_(d+)[_d]*.*) AppleWebKit/');
            if (match && match.length) {
                return parseInt(match[0]) <= major || (parseInt(match[0]) === major && parseInt(match[1]) <= minor);
            }
            return false;
        }
        function isSafari(useragent) {
            return useragent.match('Version/.* Safari/') && !isChromiumBased(useragent);
        }
        function isChromiumBased(useragent) {
            return useragent.match('Chrom(e|ium)');
        }
    }
}

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/*
 * Extract parameter from URL
 */
function getParameter(url, name) {
    // scheme : // [username [: password] @] hostname [: port] [/ [path] [? query] [# fragment]]
    var e = new RegExp('^(?:https?|ftp)(?::/*(?:[^?]+))([?][^#]+)'), matches = e.exec(url);
    if (matches && (matches === null || matches === void 0 ? void 0 : matches.length) > 1) {
        return fromQuerystring(name, matches[1]);
    }
    return null;
}
/*
 * Fix-up URL when page rendered from search engine cache or translated page.
 */
function fixupUrl(hostName, href, referrer) {
    var _a;
    if (hostName === 'translate.googleusercontent.com') {
        // Google
        if (referrer === '') {
            referrer = href;
        }
        href = (_a = getParameter(href, 'u')) !== null && _a !== void 0 ? _a : '';
        hostName = getHostName(href);
    }
    else if (hostName === 'cc.bingj.com' || // Bing & Yahoo
        hostName === 'webcache.googleusercontent.com' // Google
    ) {
        href = document.links[0].href;
        hostName = getHostName(href);
    }
    return [hostName, href, referrer];
}

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Indices of cookie values
 */
var cookieDisabledIndex = 0, domainUserIdIndex = 1, createTsIndex = 2, visitCountIndex = 3, nowTsIndex = 4, lastVisitTsIndex = 5, sessionIdIndex = 6, previousSessionIdIndex = 7, firstEventIdIndex = 8, firstEventTsInMsIndex = 9, eventIndexIndex = 10;
function emptyIdCookie() {
    var idCookie = ['1', '', 0, 0, 0, undefined, '', '', '', undefined, 0];
    return idCookie;
}
/**
 * Parses the cookie values from its string representation.
 *
 * @param id Cookie value as string
 * @param domainUserId Domain user ID to be used in case of empty cookie string
 * @returns Parsed ID cookie tuple
 */
function parseIdCookie(id, domainUserId, memorizedSessionId, memorizedVisitCount) {
    var now = new Date(), nowTs = Math.round(now.getTime() / 1000), tmpContainer;
    if (id) {
        tmpContainer = id.split('.');
        // cookies enabled
        tmpContainer.unshift('0');
    }
    else {
        tmpContainer = [
            // cookies disabled
            '1',
            // Domain user ID
            domainUserId,
            // Creation timestamp - seconds since Unix epoch
            nowTs,
            // visitCount - 0 = no previous visit
            memorizedVisitCount,
            // Current visit timestamp
            nowTs,
            // Last visit timestamp - blank meaning no previous visit
            '',
            // Session ID
            memorizedSessionId,
        ];
    }
    if (!tmpContainer[sessionIdIndex] || tmpContainer[sessionIdIndex] === 'undefined') {
        // session id
        tmpContainer[sessionIdIndex] = v4();
    }
    if (!tmpContainer[previousSessionIdIndex] || tmpContainer[previousSessionIdIndex] === 'undefined') {
        // previous session id
        tmpContainer[previousSessionIdIndex] = '';
    }
    if (!tmpContainer[firstEventIdIndex] || tmpContainer[firstEventIdIndex] === 'undefined') {
        // firstEventId - blank meaning no previous event
        tmpContainer[firstEventIdIndex] = '';
    }
    if (!tmpContainer[firstEventTsInMsIndex] || tmpContainer[firstEventTsInMsIndex] === 'undefined') {
        // firstEventTs - blank meaning no previous event
        tmpContainer[firstEventTsInMsIndex] = '';
    }
    if (!tmpContainer[eventIndexIndex] || tmpContainer[eventIndexIndex] === 'undefined') {
        // eventIndex – 0 = no previous event
        tmpContainer[eventIndexIndex] = 0;
    }
    var parseIntOr = function (value, defaultValue) {
        var parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    };
    var parseIntOrUndefined = function (value) { return (value ? parseIntOr(value, undefined) : undefined); };
    var parsed = [
        tmpContainer[cookieDisabledIndex],
        tmpContainer[domainUserIdIndex],
        parseIntOr(tmpContainer[createTsIndex], nowTs),
        parseIntOr(tmpContainer[visitCountIndex], memorizedVisitCount),
        parseIntOr(tmpContainer[nowTsIndex], nowTs),
        parseIntOrUndefined(tmpContainer[lastVisitTsIndex]),
        tmpContainer[sessionIdIndex],
        tmpContainer[previousSessionIdIndex],
        tmpContainer[firstEventIdIndex],
        parseIntOrUndefined(tmpContainer[firstEventTsInMsIndex]),
        parseIntOr(tmpContainer[eventIndexIndex], 0),
    ];
    return parsed;
}
/**
 * Initializes the domain user ID if not already present in the cookie. Sets an empty string if anonymous tracking.
 *
 * @param idCookie Parsed cookie
 * @param configAnonymousTracking Whether anonymous tracking is enabled
 * @returns Domain user ID
 */
function initializeDomainUserId(idCookie, configAnonymousTracking) {
    var domainUserId;
    if (idCookie[domainUserIdIndex]) {
        domainUserId = idCookie[domainUserIdIndex];
    }
    else if (!configAnonymousTracking) {
        domainUserId = v4();
        idCookie[domainUserIdIndex] = domainUserId;
    }
    else {
        domainUserId = '';
        idCookie[domainUserIdIndex] = domainUserId;
    }
    return domainUserId;
}
/**
 * Starts a new session with a new ID.
 * Sets the previous session, last visit timestamp, and increments visit count if cookies enabled.
 * First event references are reset and will be updated in `updateFirstEventInIdCookie`.
 *
 * @param idCookie Parsed cookie
 * @param options.configStateStorageStrategy Cookie storage strategy
 * @param options.configAnonymousTracking If anonymous tracking is enabled
 * @param options.memorizedVisitCount Visit count to be used if cookies not enabled
 * @param options.onSessionUpdateCallback Session callback triggered on every session update
 * @returns New session ID
 */
function startNewIdCookieSession(idCookie, options) {
    if (options === void 0) { options = { memorizedVisitCount: 1 }; }
    var memorizedVisitCount = options.memorizedVisitCount;
    // If cookies are enabled, base visit count and session ID on the cookies
    if (cookiesEnabledInIdCookie(idCookie)) {
        // Store the previous session ID
        idCookie[previousSessionIdIndex] = idCookie[sessionIdIndex];
        // Set lastVisitTs to currentVisitTs
        idCookie[lastVisitTsIndex] = idCookie[nowTsIndex];
        // Increment the session ID
        idCookie[visitCountIndex]++;
    }
    else {
        idCookie[visitCountIndex] = memorizedVisitCount;
    }
    // Create a new sessionId
    var sessionId = v4();
    idCookie[sessionIdIndex] = sessionId;
    // Reset event index and first event references
    idCookie[eventIndexIndex] = 0;
    idCookie[firstEventIdIndex] = '';
    idCookie[firstEventTsInMsIndex] = undefined;
    return sessionId;
}
/**
 * Update now timestamp in cookie.
 *
 * @param idCookie Parsed cookie
 */
function updateNowTsInIdCookie(idCookie) {
    idCookie[nowTsIndex] = Math.round(new Date().getTime() / 1000);
}
/**
 * Updates the first event references according to the event payload if first event in session.
 *
 * @param idCookie Parsed cookie
 * @param payloadBuilder Event payload builder
 */
function updateFirstEventInIdCookie(idCookie, payloadBuilder) {
    // Update first event references if new session or not present
    if (idCookie[eventIndexIndex] === 0) {
        var payload = payloadBuilder.build();
        idCookie[firstEventIdIndex] = payload['eid'];
        var ts = (payload['dtm'] || payload['ttm']);
        idCookie[firstEventTsInMsIndex] = ts ? parseInt(ts) : undefined;
    }
}
/**
 * Increments event index counter.
 *
 * @param idCookie Parsed cookie
 */
function incrementEventIndexInIdCookie(idCookie) {
    idCookie[eventIndexIndex] += 1;
}
/**
 * Serializes parsed cookie to string representation.
 *
 * @param idCookie Parsed cookie
 * @returns String cookie value
 */
function serializeIdCookie(idCookie) {
    idCookie.shift();
    return idCookie.join('.');
}
/**
 * Transforms the parsed cookie into a client session context entity.
 *
 * @param idCookie Parsed cookie
 * @param configStateStorageStrategy Cookie storage strategy
 * @param configAnonymousTracking If anonymous tracking is enabled
 * @returns Client session context entity
 */
function clientSessionFromIdCookie(idCookie, configStateStorageStrategy, configAnonymousTracking) {
    var firstEventTsInMs = idCookie[firstEventTsInMsIndex];
    var clientSession = {
        userId: configAnonymousTracking
            ? '00000000-0000-0000-0000-000000000000' // TODO: use uuid.NIL when we upgrade to uuid v8.3
            : idCookie[domainUserIdIndex],
        sessionId: idCookie[sessionIdIndex],
        eventIndex: idCookie[eventIndexIndex],
        sessionIndex: idCookie[visitCountIndex],
        previousSessionId: configAnonymousTracking ? null : idCookie[previousSessionIdIndex] || null,
        storageMechanism: configStateStorageStrategy == 'localStorage' ? 'LOCAL_STORAGE' : 'COOKIE_1',
        firstEventId: idCookie[firstEventIdIndex] || null,
        firstEventTimestamp: firstEventTsInMs ? new Date(firstEventTsInMs).toISOString() : null
    };
    return clientSession;
}
function sessionIdFromIdCookie(idCookie) {
    return idCookie[sessionIdIndex];
}
function domainUserIdFromIdCookie(idCookie) {
    return idCookie[domainUserIdIndex];
}
function visitCountFromIdCookie(idCookie) {
    return idCookie[visitCountIndex];
}
function cookiesEnabledInIdCookie(idCookie) {
    return idCookie[cookieDisabledIndex] === '0';
}
function eventIndexFromIdCookie(idCookie) {
    return idCookie[eventIndexIndex];
}

/* Separator used for dimension values e.g. widthxheight */
var DIMENSION_SEPARATOR = 'x';
function getBrowserProperties() {
    return {
        viewport: floorDimensionFields(detectViewport()),
        documentSize: floorDimensionFields(detectDocumentSize()),
        resolution: floorDimensionFields(detectScreenResolution()),
        colorDepth: screen.colorDepth,
        devicePixelRatio: window.devicePixelRatio,
        cookiesEnabled: window.navigator.cookieEnabled,
        online: window.navigator.onLine,
        browserLanguage: navigator.language || navigator.userLanguage,
        documentLanguage: document.documentElement.lang,
        webdriver: window.navigator.webdriver,
        deviceMemory: window.navigator.deviceMemory,
        hardwareConcurrency: window.navigator.hardwareConcurrency
    };
}
/**
 * Gets the current viewport.
 *
 * Code based on:
 * - http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
 * - http://responsejs.com/labs/dimensions/
 */
function detectViewport() {
    var width, height;
    if ('innerWidth' in window) {
        width = window['innerWidth'];
        height = window['innerHeight'];
    }
    else {
        var e = document.documentElement || document.body;
        width = e['clientWidth'];
        height = e['clientHeight'];
    }
    if (width >= 0 && height >= 0) {
        return width + DIMENSION_SEPARATOR + height;
    }
    else {
        return null;
    }
}
/**
 * Gets the dimensions of the current
 * document.
 *
 * Code based on:
 * - http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
 */
function detectDocumentSize() {
    var de = document.documentElement, // Alias
        be = document.body,
        // document.body may not have rendered, so check whether be.offsetHeight is null
        bodyHeight = be ? Math.max(be.offsetHeight, be.scrollHeight) : 0;
    var w = Math.max(de.clientWidth, de.offsetWidth, de.scrollWidth);
    var h = Math.max(de.clientHeight, de.offsetHeight, de.scrollHeight, bodyHeight);
    return isNaN(w) || isNaN(h) ? '' : w + DIMENSION_SEPARATOR + h;
}
function detectScreenResolution() {
    return screen.width + DIMENSION_SEPARATOR + screen.height;
}
function floorDimensionFields(field) {
    return (field &&
        field
            .split(DIMENSION_SEPARATOR)
            .map(function (dimension) { return Math.floor(Number(dimension)); })
            .join(DIMENSION_SEPARATOR));
}

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * The Snowplow Tracker
 *
 * @param trackerId - The unique identifier of the tracker
 * @param namespace - The namespace of the tracker object
 * @param version - The current version of the JavaScript Tracker
 * @param endpoint - The collector endpoint to send events to, with or without protocol
 * @param sharedState - An object containing state which is shared across tracker instances
 * @param trackerConfiguration - Dictionary of configuration options
 */
function Tracker(trackerId, namespace, version, endpoint, sharedState, trackerConfiguration) {
    if (trackerConfiguration === void 0) { trackerConfiguration = {}; }
    var browserPlugins = [];
    var newTracker = function (trackerId, namespace, version, endpoint, state, trackerConfiguration) {
        /************************************************************
         * Private members
         ************************************************************/
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
        //use POST if eventMethod isn't present on the newTrackerConfiguration
        trackerConfiguration.eventMethod = (_a = trackerConfiguration.eventMethod) !== null && _a !== void 0 ? _a : 'post';
        var getStateStorageStrategy = function (config) { var _a; return (_a = config.stateStorageStrategy) !== null && _a !== void 0 ? _a : 'cookieAndLocalStorage'; }, getAnonymousSessionTracking = function (config) {
            var _a, _b;
            if (typeof config.anonymousTracking === 'boolean') {
                return false;
            }
            return (_b = ((_a = config.anonymousTracking) === null || _a === void 0 ? void 0 : _a.withSessionTracking) === true) !== null && _b !== void 0 ? _b : false;
        }, getAnonymousServerTracking = function (config) {
            var _a, _b;
            if (typeof config.anonymousTracking === 'boolean') {
                return false;
            }
            return (_b = ((_a = config.anonymousTracking) === null || _a === void 0 ? void 0 : _a.withServerAnonymisation) === true) !== null && _b !== void 0 ? _b : false;
        }, getAnonymousTracking = function (config) { return !!config.anonymousTracking; }, isBrowserContextAvailable = (_c = (_b = trackerConfiguration === null || trackerConfiguration === void 0 ? void 0 : trackerConfiguration.contexts) === null || _b === void 0 ? void 0 : _b.browser) !== null && _c !== void 0 ? _c : false, isWebPageContextAvailable = (_e = (_d = trackerConfiguration === null || trackerConfiguration === void 0 ? void 0 : trackerConfiguration.contexts) === null || _d === void 0 ? void 0 : _d.webPage) !== null && _e !== void 0 ? _e : true;
        // Get all injected plugins
        browserPlugins.push(getBrowserDataPlugin());
        /* When including the Web Page context, we add the relevant internal plugins */
        if (isWebPageContextAvailable) {
            browserPlugins.push(getWebPagePlugin());
        }
        if (isBrowserContextAvailable) {
            browserPlugins.push(getBrowserContextPlugin());
        }
        browserPlugins.push.apply(browserPlugins, ((_f = trackerConfiguration.plugins) !== null && _f !== void 0 ? _f : []));
        var // Tracker core
            core = trackerCore({
                base64: trackerConfiguration.encodeBase64,
                corePlugins: browserPlugins,
                callback: sendRequest
            }),
            // Aliases
            documentCharset = document.characterSet || document.charset,
            // Current URL and Referrer URL
            locationArray = fixupUrl(window.location.hostname, window.location.href, getReferrer()), domainAlias = fixupDomain(locationArray[0]), locationHrefAlias = locationArray[1], configReferrerUrl = locationArray[2], customReferrer,
            // Platform defaults to web for this tracker
            configPlatform = (_g = trackerConfiguration.platform) !== null && _g !== void 0 ? _g : 'web',
            // Snowplow collector URL
            configCollectorUrl = asCollectorUrl(endpoint),
            // Custom path for post requests (to get around adblockers)
            configPostPath = (_h = trackerConfiguration.postPath) !== null && _h !== void 0 ? _h : '/com.snowplowanalytics.snowplow/tp2',
            // Site ID
            configTrackerSiteId = (_j = trackerConfiguration.appId) !== null && _j !== void 0 ? _j : '',
            // Document URL
            configCustomUrl,
            // Document title
            lastDocumentTitle = document.title,
            // Custom title
            lastConfigTitle,
            // Controls whether activity tracking page ping event timers are reset on page view events
            resetActivityTrackingOnPageView = (_k = trackerConfiguration.resetActivityTrackingOnPageView) !== null && _k !== void 0 ? _k : true,
            // Disallow hash tags in URL. TODO: Should this be set to true by default?
            configDiscardHashTag,
            // Disallow brace in URL.
            configDiscardBrace,
            // First-party cookie name prefix
            configCookieNamePrefix = (_l = trackerConfiguration.cookieName) !== null && _l !== void 0 ? _l : '_sp_',
            // First-party cookie domain
            // User agent defaults to origin hostname
            configCookieDomain = (_m = trackerConfiguration.cookieDomain) !== null && _m !== void 0 ? _m : undefined,
            // First-party cookie path
            // Default is user agent defined.
            configCookiePath = '/',
            // First-party cookie samesite attribute
            configCookieSameSite = (_o = trackerConfiguration.cookieSameSite) !== null && _o !== void 0 ? _o : 'None',
            // First-party cookie secure attribute
            configCookieSecure = (_p = trackerConfiguration.cookieSecure) !== null && _p !== void 0 ? _p : true,
            // Do Not Track browser feature
            dnt = navigator.doNotTrack || navigator.msDoNotTrack || window.doNotTrack,
            // Do Not Track
            configDoNotTrack = typeof trackerConfiguration.respectDoNotTrack !== 'undefined'
                ? trackerConfiguration.respectDoNotTrack && (dnt === 'yes' || dnt === '1')
                : false,
            // Opt out of cookie tracking
            configOptOutCookie,
            // Life of the visitor cookie (in seconds)
            configVisitorCookieTimeout = (_q = trackerConfiguration.cookieLifetime) !== null && _q !== void 0 ? _q : 63072000, // 2 years
            // Life of the session cookie (in seconds)
            configSessionCookieTimeout = (_r = trackerConfiguration.sessionCookieTimeout) !== null && _r !== void 0 ? _r : 1800, // 30 minutes
            // Allows tracking user session (using cookies or local storage), can only be used with anonymousTracking
            configAnonymousSessionTracking = getAnonymousSessionTracking(trackerConfiguration),
            // Will send a header to server to prevent returning cookie and capturing IP
            configAnonymousServerTracking = getAnonymousServerTracking(trackerConfiguration),
            // Sets tracker to work in anonymous mode without accessing client storage
            configAnonymousTracking = getAnonymousTracking(trackerConfiguration),
            // Strategy defining how to store the state: cookie, localStorage, cookieAndLocalStorage or none
            configStateStorageStrategy = getStateStorageStrategy(trackerConfiguration),
            // Last activity timestamp
            lastActivityTime,
            // The last time an event was fired on the page - used to invalidate session if cookies are disabled
            lastEventTime = new Date().getTime(),
            // How are we scrolling?
            minXOffset, maxXOffset, minYOffset, maxYOffset,
            // Domain hash value
            domainHash,
            // Domain unique user ID
            domainUserId,
            // ID for the current session
            memorizedSessionId,
            // Index for the current session - kept in memory in case cookies are disabled
            memorizedVisitCount = 1,
            // Business-defined unique user ID
            businessUserId,
            // Manager for local storage queue
            outQueue = OutQueueManager(trackerId, state, configStateStorageStrategy == 'localStorage' || configStateStorageStrategy == 'cookieAndLocalStorage', trackerConfiguration.eventMethod, configPostPath, (_s = trackerConfiguration.bufferSize) !== null && _s !== void 0 ? _s : 1, (_t = trackerConfiguration.maxPostBytes) !== null && _t !== void 0 ? _t : 40000, (_u = trackerConfiguration.maxGetBytes) !== null && _u !== void 0 ? _u : 0, (_v = trackerConfiguration.useStm) !== null && _v !== void 0 ? _v : true, (_w = trackerConfiguration.maxLocalStorageQueueSize) !== null && _w !== void 0 ? _w : 1000, (_x = trackerConfiguration.connectionTimeout) !== null && _x !== void 0 ? _x : 5000, configAnonymousServerTracking, (_y = trackerConfiguration.customHeaders) !== null && _y !== void 0 ? _y : {}, (_z = trackerConfiguration.withCredentials) !== null && _z !== void 0 ? _z : true, (_0 = trackerConfiguration.retryStatusCodes) !== null && _0 !== void 0 ? _0 : [], ((_1 = trackerConfiguration.dontRetryStatusCodes) !== null && _1 !== void 0 ? _1 : []).concat([400, 401, 403, 410, 422])),
            // Whether pageViewId should be regenerated after each trackPageView. Affect web_page context
            preservePageViewId = false,
            // Whether first trackPageView was fired and pageViewId should not be changed anymore until reload
            pageViewSent = false,
            // Activity tracking config for callback and page ping variants
            activityTrackingConfig = {
                enabled: false,
                installed: false,
                configurations: {}
            }, configSessionContext = (_3 = (_2 = trackerConfiguration.contexts) === null || _2 === void 0 ? void 0 : _2.session) !== null && _3 !== void 0 ? _3 : false, toOptoutByCookie, onSessionUpdateCallback = trackerConfiguration.onSessionUpdateCallback, manualSessionUpdateCalled = false;
        if (trackerConfiguration.hasOwnProperty('discoverRootDomain') && trackerConfiguration.discoverRootDomain) {
            configCookieDomain = findRootDomain(configCookieSameSite, configCookieSecure);
        }
        var _4 = getBrowserProperties(), browserLanguage = _4.browserLanguage, resolution = _4.resolution, colorDepth = _4.colorDepth, cookiesEnabled = _4.cookiesEnabled;
        // Set up unchanging name-value pairs
        core.setTrackerVersion(version);
        core.setTrackerNamespace(namespace);
        core.setAppId(configTrackerSiteId);
        core.setPlatform(configPlatform);
        core.addPayloadPair('cookie', cookiesEnabled ? '1' : '0');
        core.addPayloadPair('cs', documentCharset);
        core.addPayloadPair('lang', browserLanguage);
        core.addPayloadPair('res', resolution);
        core.addPayloadPair('cd', colorDepth);
        /*
         * Initialize tracker
         */
        updateDomainHash();
        initializeIdsAndCookies();
        if (trackerConfiguration.crossDomainLinker) {
            decorateLinks(trackerConfiguration.crossDomainLinker);
        }
        /**
         * Recalculate the domain, URL, and referrer
         */
        function refreshUrl() {
            locationArray = fixupUrl(window.location.hostname, window.location.href, getReferrer());
            // If this is a single-page app and the page URL has changed, then:
            //   - if the new URL's querystring contains a "refer(r)er" parameter, use it as the referrer
            //   - otherwise use the old URL as the referer
            if (locationArray[1] !== locationHrefAlias) {
                configReferrerUrl = getReferrer(locationHrefAlias);
            }
            domainAlias = fixupDomain(locationArray[0]);
            locationHrefAlias = locationArray[1];
        }
        /**
         * Decorate the querystring of a single link
         *
         * @param event - e The event targeting the link
         */
        function linkDecorationHandler(evt) {
            var timestamp = new Date().getTime();
            var elt = evt.currentTarget;
            if (elt === null || elt === void 0 ? void 0 : elt.href) {
                elt.href = decorateQuerystring(elt.href, '_sp', domainUserId + '.' + timestamp);
            }
        }
        /**
         * Enable querystring decoration for links pasing a filter
         * Whenever such a link is clicked on or navigated to via the keyboard,
         * add "_sp={{duid}}.{{timestamp}}" to its querystring
         *
         * @param crossDomainLinker - Function used to determine which links to decorate
         */
        function decorateLinks(crossDomainLinker) {
            for (var i = 0; i < document.links.length; i++) {
                var elt = document.links[i];
                if (!elt.spDecorationEnabled && crossDomainLinker(elt)) {
                    addEventListener(elt, 'click', linkDecorationHandler, true);
                    addEventListener(elt, 'mousedown', linkDecorationHandler, true);
                    // Don't add event listeners more than once
                    elt.spDecorationEnabled = true;
                }
            }
        }
        /*
         * Removes hash tag from the URL
         *
         * URLs are purified before being recorded in the cookie,
         * or before being sent as GET parameters
         */
        function purify(url) {
            var targetPattern;
            if (configDiscardHashTag) {
                targetPattern = new RegExp('#.*');
                url = url.replace(targetPattern, '');
            }
            if (configDiscardBrace) {
                targetPattern = new RegExp('[{}]', 'g');
                url = url.replace(targetPattern, '');
            }
            return url;
        }
        /*
         * Extract scheme/protocol from URL
         */
        function getProtocolScheme(url) {
            var e = new RegExp('^([a-z]+):'), matches = e.exec(url);
            return matches ? matches[1] : null;
        }
        /*
         * Resolve relative reference
         *
         * Note: not as described in rfc3986 section 5.2
         */
        function resolveRelativeReference(baseUrl, url) {
            var protocol = getProtocolScheme(url), i;
            if (protocol) {
                return url;
            }
            if (url.slice(0, 1) === '/') {
                return getProtocolScheme(baseUrl) + '://' + getHostName(baseUrl) + url;
            }
            baseUrl = purify(baseUrl);
            if ((i = baseUrl.indexOf('?')) >= 0) {
                baseUrl = baseUrl.slice(0, i);
            }
            if ((i = baseUrl.lastIndexOf('/')) !== baseUrl.length - 1) {
                baseUrl = baseUrl.slice(0, i + 1);
            }
            return baseUrl + url;
        }
        /*
         * Send request
         */
        function sendRequest(request) {
            if (!(configDoNotTrack || toOptoutByCookie)) {
                outQueue.enqueueRequest(request.build(), configCollectorUrl);
            }
        }
        /*
         * Get cookie name with prefix and domain hash
         */
        function getSnowplowCookieName(baseName) {
            return configCookieNamePrefix + baseName + '.' + domainHash;
        }
        /*
         * Cookie getter.
         */
        function getSnowplowCookieValue(cookieName) {
            var fullName = getSnowplowCookieName(cookieName);
            if (configStateStorageStrategy == 'localStorage') {
                return attemptGetLocalStorage(fullName);
            }
            else if (configStateStorageStrategy == 'cookie' || configStateStorageStrategy == 'cookieAndLocalStorage') {
                return cookie(fullName);
            }
            return undefined;
        }
        /*
         * Update domain hash
         */
        function updateDomainHash() {
            refreshUrl();
            domainHash = hash((configCookieDomain || domainAlias) + (configCookiePath || '/')).slice(0, 4); // 4 hexits = 16 bits
        }
        /*
         * Process all "activity" events.
         * For performance, this function must have low overhead.
         */
        function activityHandler() {
            var now = new Date();
            lastActivityTime = now.getTime();
        }
        /*
         * Process all "scroll" events.
         */
        function scrollHandler() {
            updateMaxScrolls();
            activityHandler();
        }
        /*
         * Returns [pageXOffset, pageYOffset]
         */
        function getPageOffsets() {
            var documentElement = document.documentElement;
            if (documentElement) {
                return [documentElement.scrollLeft || window.pageXOffset, documentElement.scrollTop || window.pageYOffset];
            }
            return [0, 0];
        }
        /*
         * Quick initialization/reset of max scroll levels
         */
        function resetMaxScrolls() {
            var offsets = getPageOffsets();
            var x = offsets[0];
            minXOffset = x;
            maxXOffset = x;
            var y = offsets[1];
            minYOffset = y;
            maxYOffset = y;
        }
        /*
         * Check the max scroll levels, updating as necessary
         */
        function updateMaxScrolls() {
            var offsets = getPageOffsets();
            var x = offsets[0];
            if (x < minXOffset) {
                minXOffset = x;
            }
            else if (x > maxXOffset) {
                maxXOffset = x;
            }
            var y = offsets[1];
            if (y < minYOffset) {
                minYOffset = y;
            }
            else if (y > maxYOffset) {
                maxYOffset = y;
            }
        }
        /*
         * Prevents offsets from being decimal or NaN
         * See https://github.com/snowplow/snowplow-javascript-tracker/issues/324
         */
        function cleanOffset(offset) {
            return Math.round(offset);
        }
        /**
         * Sets or renews the session cookie.
         * Responsible for calling the `onSessionUpdateCallback` callback.
         * @returns {boolean} If the value persisted in cookies or LocalStorage
         */
        function setSessionCookie() {
            var cookieName = getSnowplowCookieName('ses');
            var cookieValue = '*';
            return persistValue(cookieName, cookieValue, configSessionCookieTimeout);
        }
        /**
         * @mutates idCookie
         * @param {ParsedIdCookie} idCookie
         * @returns {boolean} If the value persisted in cookies or LocalStorage
         */
        function setDomainUserIdCookie(idCookie) {
            var cookieName = getSnowplowCookieName('id');
            var cookieValue = serializeIdCookie(idCookie);
            return persistValue(cookieName, cookieValue, configVisitorCookieTimeout);
        }
        /**
         * no-op if anonymousTracking enabled, will still set cookies if anonymousSessionTracking is enabled
         * Sets a cookie based on the storage strategy:
         * - if 'localStorage': attempts to write to local storage
         * - if 'cookie' or 'cookieAndLocalStorage': writes to cookies
         * - otherwise: no-op
         * @param {string} name Name/key of the value to persist
         * @param {string} value
         * @param {number} timeout Used as the expiration date for cookies or as a TTL to be checked on LocalStorage
         * @returns {boolean} If the operation was successful or not
         */
        function persistValue(name, value, timeout) {
            if (configAnonymousTracking && !configAnonymousSessionTracking) {
                return false;
            }
            if (configStateStorageStrategy == 'localStorage') {
                return attemptWriteLocalStorage(name, value, timeout);
            }
            else if (configStateStorageStrategy == 'cookie' || configStateStorageStrategy == 'cookieAndLocalStorage') {
                cookie(name, value, timeout, configCookiePath, configCookieDomain, configCookieSameSite, configCookieSecure);
                return document.cookie.indexOf("".concat(name, "=")) !== -1 ? true : false;
            }
            return false;
        }
        /**
         * Clears all cookie and local storage for id and ses values
         */
        function clearUserDataAndCookies(configuration) {
            var idname = getSnowplowCookieName('id');
            var sesname = getSnowplowCookieName('ses');
            attemptDeleteLocalStorage(idname);
            attemptDeleteLocalStorage(sesname);
            deleteCookie(idname, configCookieDomain, configCookieSameSite, configCookieSecure);
            deleteCookie(sesname, configCookieDomain, configCookieSameSite, configCookieSecure);
            if (!(configuration === null || configuration === void 0 ? void 0 : configuration.preserveSession)) {
                memorizedSessionId = v4();
                memorizedVisitCount = 1;
            }
            if (!(configuration === null || configuration === void 0 ? void 0 : configuration.preserveUser)) {
                domainUserId = configAnonymousTracking ? '' : v4();
                businessUserId = null;
            }
        }
        /**
         * Toggle Anonymous Tracking
         */
        function toggleAnonymousTracking(configuration) {
            if (configuration && configuration.stateStorageStrategy) {
                trackerConfiguration.stateStorageStrategy = configuration.stateStorageStrategy;
                configStateStorageStrategy = getStateStorageStrategy(trackerConfiguration);
            }
            configAnonymousTracking = getAnonymousTracking(trackerConfiguration);
            configAnonymousSessionTracking = getAnonymousSessionTracking(trackerConfiguration);
            configAnonymousServerTracking = getAnonymousServerTracking(trackerConfiguration);
            outQueue.setUseLocalStorage(configStateStorageStrategy == 'localStorage' || configStateStorageStrategy == 'cookieAndLocalStorage');
            outQueue.setAnonymousTracking(configAnonymousServerTracking);
        }
        /*
         * Load the domain user ID and the session ID
         * Set the cookies (if cookies are enabled)
         */
        function initializeIdsAndCookies() {
            if (configAnonymousTracking && !configAnonymousSessionTracking) {
                return;
            }
            var sesCookieSet = configStateStorageStrategy != 'none' && !!getSnowplowCookieValue('ses');
            var idCookie = loadDomainUserIdCookie();
            domainUserId = initializeDomainUserId(idCookie, configAnonymousTracking);
            if (!sesCookieSet) {
                memorizedSessionId = startNewIdCookieSession(idCookie);
            }
            else {
                memorizedSessionId = sessionIdFromIdCookie(idCookie);
            }
            memorizedVisitCount = visitCountFromIdCookie(idCookie);
            if (configStateStorageStrategy != 'none') {
                setSessionCookie();
                // Update currentVisitTs
                updateNowTsInIdCookie(idCookie);
                setDomainUserIdCookie(idCookie);
            }
        }
        /*
         * Load visitor ID cookie
         */
        function loadDomainUserIdCookie() {
            if (configStateStorageStrategy == 'none') {
                return emptyIdCookie();
            }
            var id = getSnowplowCookieValue('id') || undefined;
            return parseIdCookie(id, domainUserId, memorizedSessionId, memorizedVisitCount);
        }
        /**
         * Adds the protocol in front of our collector URL
         *
         * @param string - collectorUrl The collector URL with or without protocol
         * @returns string collectorUrl The tracker URL with protocol
         */
        function asCollectorUrl(collectorUrl) {
            if (collectorUrl.indexOf('http') === 0) {
                return collectorUrl;
            }
            return ('https:' === document.location.protocol ? 'https' : 'http') + '://' + collectorUrl;
        }
        /**
         * Initialize new `pageViewId` if it shouldn't be preserved.
         * Should be called when `trackPageView` is invoked
         */
        function resetPageView() {
            if (!preservePageViewId || state.pageViewId == null) {
                state.pageViewId = v4();
            }
        }
        /**
         * Safe function to get `pageViewId`.
         * Generates it if it wasn't initialized by other tracker
         */
        function getPageViewId() {
            if (state.pageViewId == null) {
                state.pageViewId = v4();
            }
            return state.pageViewId;
        }
        /**
         * Safe function to get `tabId`.
         * Generates it if it is not yet initialized. Shared between trackers.
         */
        function getTabId() {
            if (configStateStorageStrategy === 'none' || configAnonymousTracking || !isWebPageContextAvailable) {
                return null;
            }
            var SESSION_STORAGE_TAB_ID = '_sp_tab_id';
            var tabId = attemptGetSessionStorage(SESSION_STORAGE_TAB_ID);
            if (!tabId) {
                attemptWriteSessionStorage(SESSION_STORAGE_TAB_ID, v4());
                tabId = attemptGetSessionStorage(SESSION_STORAGE_TAB_ID);
            }
            return tabId || null;
        }
        /**
         * Put together a web page context with a unique UUID for the page view
         *
         * @returns web_page context
         */
        function getWebPagePlugin() {
            return {
                contexts: function () {
                    return [
                        {
                            schema: WEB_PAGE_SCHEMA,
                            data: {
                                id: getPageViewId()
                            }
                        },
                    ];
                }
            };
        }
        function getBrowserContextPlugin() {
            return {
                contexts: function () {
                    return [
                        {
                            schema: BROWSER_CONTEXT_SCHEMA,
                            data: __assign(__assign({}, getBrowserProperties()), { tabId: getTabId() })
                        },
                    ];
                }
            };
        }
        /*
         * Attaches common web fields to every request (resolution, url, referrer, etc.)
         * Also sets the required cookies.
         */
        function getBrowserDataPlugin() {
            var anonymizeOr = function (value) { return (configAnonymousTracking ? null : value); };
            var anonymizeSessionOr = function (value) {
                return configAnonymousSessionTracking ? value : anonymizeOr(value);
            };
            return {
                beforeTrack: function (payloadBuilder) {
                    var existingSession = getSnowplowCookieValue('ses'), idCookie = loadDomainUserIdCookie();
                    var isFirstEventInSession = eventIndexFromIdCookie(idCookie) === 0;
                    if (configOptOutCookie) {
                        toOptoutByCookie = !!cookie(configOptOutCookie);
                    }
                    else {
                        toOptoutByCookie = false;
                    }
                    if (configDoNotTrack || toOptoutByCookie) {
                        clearUserDataAndCookies();
                        return;
                    }
                    // If cookies are enabled, base visit count and session ID on the cookies
                    if (cookiesEnabledInIdCookie(idCookie)) {
                        // New session?
                        if (!existingSession && configStateStorageStrategy != 'none') {
                            memorizedSessionId = startNewIdCookieSession(idCookie);
                        }
                        else {
                            memorizedSessionId = sessionIdFromIdCookie(idCookie);
                        }
                        memorizedVisitCount = visitCountFromIdCookie(idCookie);
                    }
                    else if (new Date().getTime() - lastEventTime > configSessionCookieTimeout * 1000) {
                        memorizedVisitCount++;
                        memorizedSessionId = startNewIdCookieSession(idCookie, {
                            memorizedVisitCount: memorizedVisitCount
                        });
                    }
                    // Update cookie
                    updateNowTsInIdCookie(idCookie);
                    updateFirstEventInIdCookie(idCookie, payloadBuilder);
                    incrementEventIndexInIdCookie(idCookie);
                    var _a = getBrowserProperties(), viewport = _a.viewport, documentSize = _a.documentSize;
                    payloadBuilder.add('vp', viewport);
                    payloadBuilder.add('ds', documentSize);
                    payloadBuilder.add('vid', anonymizeSessionOr(memorizedVisitCount));
                    payloadBuilder.add('sid', anonymizeSessionOr(memorizedSessionId));
                    payloadBuilder.add('duid', anonymizeOr(domainUserIdFromIdCookie(idCookie))); // Always load from cookie as this is better etiquette than in-memory values
                    payloadBuilder.add('uid', anonymizeOr(businessUserId));
                    refreshUrl();
                    payloadBuilder.add('refr', purify(customReferrer || configReferrerUrl));
                    // Add the page URL last as it may take us over the IE limit (and we don't always need it)
                    payloadBuilder.add('url', purify(configCustomUrl || locationHrefAlias));
                    var clientSession = clientSessionFromIdCookie(idCookie, configStateStorageStrategy, configAnonymousTracking);
                    if (configSessionContext && (!configAnonymousTracking || configAnonymousSessionTracking)) {
                        addSessionContextToPayload(payloadBuilder, clientSession);
                    }
                    // Update cookies
                    if (configStateStorageStrategy != 'none') {
                        setDomainUserIdCookie(idCookie);
                        var sessionIdentifierPersisted = setSessionCookie();
                        if ((!existingSession || isFirstEventInSession) &&
                            sessionIdentifierPersisted &&
                            onSessionUpdateCallback &&
                            !manualSessionUpdateCalled) {
                            onSessionUpdateCallback(clientSession);
                            manualSessionUpdateCalled = false;
                        }
                    }
                    lastEventTime = new Date().getTime();
                }
            };
        }
        function addSessionContextToPayload(payloadBuilder, clientSession) {
            var sessionContext = {
                schema: CLIENT_SESSION_SCHEMA,
                data: clientSession
            };
            payloadBuilder.addContextEntity(sessionContext);
        }
        /**
         * Expires current session and starts a new session.
         */
        function newSession() {
            // If cookies are enabled, base visit count and session ID on the cookies
            var idCookie = loadDomainUserIdCookie();
            // When cookies are enabled
            if (cookiesEnabledInIdCookie(idCookie)) {
                // When cookie/local storage is enabled - make a new session
                if (configStateStorageStrategy != 'none') {
                    memorizedSessionId = startNewIdCookieSession(idCookie);
                }
                else {
                    memorizedSessionId = sessionIdFromIdCookie(idCookie);
                }
                memorizedVisitCount = visitCountFromIdCookie(idCookie);
            }
            else {
                memorizedVisitCount++;
                memorizedSessionId = startNewIdCookieSession(idCookie, {
                    memorizedVisitCount: memorizedVisitCount
                });
            }
            updateNowTsInIdCookie(idCookie);
            // Update cookies
            if (configStateStorageStrategy != 'none') {
                var clientSession = clientSessionFromIdCookie(idCookie, configStateStorageStrategy, configAnonymousTracking);
                setDomainUserIdCookie(idCookie);
                var sessionIdentifierPersisted = setSessionCookie();
                if (sessionIdentifierPersisted && onSessionUpdateCallback) {
                    manualSessionUpdateCalled = true;
                    onSessionUpdateCallback(clientSession);
                }
            }
            lastEventTime = new Date().getTime();
        }
        /**
         * Combine an array of unchanging contexts with the result of a context-creating function
         *
         * @param staticContexts - Array of custom contexts
         * @param contextCallback - Function returning an array of contexts
         */
        function finalizeContexts(staticContexts, contextCallback) {
            return (staticContexts || []).concat(contextCallback ? contextCallback() : []);
        }
        function logPageView(_a) {
            var title = _a.title, context = _a.context, timestamp = _a.timestamp, contextCallback = _a.contextCallback;
            refreshUrl();
            if (pageViewSent) {
                // Do not reset pageViewId if previous events were not page_view
                resetPageView();
            }
            pageViewSent = true;
            // So we know what document.title was at the time of trackPageView
            lastDocumentTitle = document.title;
            lastConfigTitle = title;
            // Fixup page title
            var pageTitle = fixupTitle(lastConfigTitle || lastDocumentTitle);
            // Log page view
            core.track(buildPageView({
                pageUrl: purify(configCustomUrl || locationHrefAlias),
                pageTitle: pageTitle,
                referrer: purify(customReferrer || configReferrerUrl)
            }), finalizeContexts(context, contextCallback), timestamp);
            // Send ping (to log that user has stayed on page)
            var now = new Date();
            var installingActivityTracking = false;
            if (activityTrackingConfig.enabled && !activityTrackingConfig.installed) {
                activityTrackingConfig.installed = true;
                installingActivityTracking = true;
                // Add mousewheel event handler, detect passive event listeners for performance
                var detectPassiveEvents_1 = {
                    update: function update() {
                        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                            var passive_1 = false;
                            var options = Object.defineProperty({}, 'passive', {
                                get: function get() {
                                    passive_1 = true;
                                },
                                set: function set() { }
                            });
                            // note: have to set and remove a no-op listener instead of null
                            // (which was used previously), because Edge v15 throws an error
                            // when providing a null callback.
                            // https://github.com/rafrex/detect-passive-events/pull/3
                            var noop = function noop() { };
                            window.addEventListener('testPassiveEventSupport', noop, options);
                            window.removeEventListener('testPassiveEventSupport', noop, options);
                            detectPassiveEvents_1.hasSupport = passive_1;
                        }
                    }
                };
                detectPassiveEvents_1.update();
                // Detect available wheel event
                var wheelEvent = 'onwheel' in document.createElement('div')
                    ? 'wheel' // Modern browsers support "wheel"
                    : document.onmousewheel !== undefined
                        ? 'mousewheel' // Webkit and IE support at least "mousewheel"
                        : 'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox
                if (Object.prototype.hasOwnProperty.call(detectPassiveEvents_1, 'hasSupport')) {
                    addEventListener(document, wheelEvent, activityHandler, { passive: true });
                }
                else {
                    addEventListener(document, wheelEvent, activityHandler);
                }
                // Capture our initial scroll points
                resetMaxScrolls();
                // Add event handlers; cross-browser compatibility here varies significantly
                // @see http://quirksmode.org/dom/events
                var documentHandlers = [
                    'click',
                    'mouseup',
                    'mousedown',
                    'mousemove',
                    'keypress',
                    'keydown',
                    'keyup',
                    'touchend',
                    'touchstart',
                ];
                var windowHandlers = ['resize', 'focus', 'blur'];
                var listener = function (_, handler) {
                    if (handler === void 0) { handler = activityHandler; }
                    return function (ev) {
                        return addEventListener(document, ev, handler);
                    };
                };
                documentHandlers.forEach(listener(document));
                windowHandlers.forEach(listener(window));
                listener(window, scrollHandler)('scroll');
            }
            if (activityTrackingConfig.enabled && (resetActivityTrackingOnPageView || installingActivityTracking)) {
                // Periodic check for activity.
                lastActivityTime = now.getTime();
                var key = void 0;
                for (key in activityTrackingConfig.configurations) {
                    var config = activityTrackingConfig.configurations[key];
                    if (config) {
                        //Clear page ping heartbeat on new page view
                        window.clearInterval(config.activityInterval);
                        scheduleActivityInterval(config, context, contextCallback);
                    }
                }
            }
        }
        function scheduleActivityInterval(config, context, contextCallback) {
            var executePagePing = function (cb, context) {
                refreshUrl();
                cb({ context: context, pageViewId: getPageViewId(), minXOffset: minXOffset, minYOffset: minYOffset, maxXOffset: maxXOffset, maxYOffset: maxYOffset });
                resetMaxScrolls();
            };
            var timeout = function () {
                var now = new Date();
                // There was activity during the heart beat period;
                // on average, this is going to overstate the visitDuration by configHeartBeatTimer/2
                if (lastActivityTime + config.configMinimumVisitLength > now.getTime()) {
                    executePagePing(config.callback, finalizeContexts(context, contextCallback));
                }
                config.activityInterval = window.setInterval(heartbeat, config.configHeartBeatTimer);
            };
            var heartbeat = function () {
                var now = new Date();
                // There was activity during the heart beat period;
                // on average, this is going to overstate the visitDuration by configHeartBeatTimer/2
                if (lastActivityTime + config.configHeartBeatTimer > now.getTime()) {
                    executePagePing(config.callback, finalizeContexts(context, contextCallback));
                }
            };
            if (config.configMinimumVisitLength === 0) {
                config.activityInterval = window.setInterval(heartbeat, config.configHeartBeatTimer);
            }
            else {
                config.activityInterval = window.setTimeout(timeout, config.configMinimumVisitLength);
            }
        }
        /**
         * Configure the activity tracking and ensures integer values for min visit and heartbeat
         */
        function configureActivityTracking(configuration) {
            var minimumVisitLength = configuration.minimumVisitLength, heartbeatDelay = configuration.heartbeatDelay, callback = configuration.callback;
            if (isInteger(minimumVisitLength) && isInteger(heartbeatDelay)) {
                return {
                    configMinimumVisitLength: minimumVisitLength * 1000,
                    configHeartBeatTimer: heartbeatDelay * 1000,
                    callback: callback
                };
            }
            LOG.error('Activity tracking minimumVisitLength & heartbeatDelay must be integers');
            return undefined;
        }
        /**
         * Log that a user is still viewing a given page by sending a page ping.
         * Not part of the public API - only called from logPageView() above.
         */
        function logPagePing(_a) {
            var context = _a.context, minXOffset = _a.minXOffset, minYOffset = _a.minYOffset, maxXOffset = _a.maxXOffset, maxYOffset = _a.maxYOffset;
            var newDocumentTitle = document.title;
            if (newDocumentTitle !== lastDocumentTitle) {
                lastDocumentTitle = newDocumentTitle;
                lastConfigTitle = undefined;
            }
            core.track(buildPagePing({
                pageUrl: purify(configCustomUrl || locationHrefAlias),
                pageTitle: fixupTitle(lastConfigTitle || lastDocumentTitle),
                referrer: purify(customReferrer || configReferrerUrl),
                minXOffset: cleanOffset(minXOffset),
                maxXOffset: cleanOffset(maxXOffset),
                minYOffset: cleanOffset(minYOffset),
                maxYOffset: cleanOffset(maxYOffset)
            }), context);
        }
        function disableActivityTrackingAction(actionKey) {
            var callbackConfiguration = activityTrackingConfig.configurations[actionKey];
            if ((callbackConfiguration === null || callbackConfiguration === void 0 ? void 0 : callbackConfiguration.configMinimumVisitLength) === 0) {
                window.clearTimeout(callbackConfiguration === null || callbackConfiguration === void 0 ? void 0 : callbackConfiguration.activityInterval);
            }
            else {
                window.clearInterval(callbackConfiguration === null || callbackConfiguration === void 0 ? void 0 : callbackConfiguration.activityInterval);
            }
            activityTrackingConfig.configurations[actionKey] = undefined;
        }
        var apiMethods = {
            getDomainSessionIndex: function () {
                return memorizedVisitCount;
            },
            getPageViewId: getPageViewId,
            getTabId: getTabId,
            newSession: newSession,
            getCookieName: function (basename) {
                return getSnowplowCookieName(basename);
            },
            getUserId: function () {
                return businessUserId;
            },
            getDomainUserId: function () {
                return loadDomainUserIdCookie()[1];
            },
            getDomainUserInfo: function () {
                return loadDomainUserIdCookie();
            },
            setReferrerUrl: function (url) {
                customReferrer = url;
            },
            setCustomUrl: function (url) {
                refreshUrl();
                configCustomUrl = resolveRelativeReference(locationHrefAlias, url);
            },
            setDocumentTitle: function (title) {
                // So we know what document.title was at the time of trackPageView
                lastDocumentTitle = document.title;
                lastConfigTitle = title;
            },
            discardHashTag: function (enableFilter) {
                configDiscardHashTag = enableFilter;
            },
            discardBrace: function (enableFilter) {
                configDiscardBrace = enableFilter;
            },
            setCookiePath: function (path) {
                configCookiePath = path;
                updateDomainHash();
            },
            setVisitorCookieTimeout: function (timeout) {
                configVisitorCookieTimeout = timeout;
            },
            crossDomainLinker: function (crossDomainLinkerCriterion) {
                decorateLinks(crossDomainLinkerCriterion);
            },
            enableActivityTracking: function (configuration) {
                if (!activityTrackingConfig.configurations.pagePing) {
                    activityTrackingConfig.enabled = true;
                    activityTrackingConfig.configurations.pagePing = configureActivityTracking(__assign(__assign({}, configuration), { callback: logPagePing }));
                }
            },
            enableActivityTrackingCallback: function (configuration) {
                if (!activityTrackingConfig.configurations.callback) {
                    activityTrackingConfig.enabled = true;
                    activityTrackingConfig.configurations.callback = configureActivityTracking(configuration);
                }
            },
            disableActivityTracking: function () {
                disableActivityTrackingAction('pagePing');
            },
            disableActivityTrackingCallback: function () {
                disableActivityTrackingAction('callback');
            },
            updatePageActivity: function () {
                activityHandler();
            },
            setOptOutCookie: function (name) {
                configOptOutCookie = name;
            },
            setUserId: function (userId) {
                businessUserId = userId;
            },
            setUserIdFromLocation: function (querystringField) {
                refreshUrl();
                businessUserId = fromQuerystring(querystringField, locationHrefAlias);
            },
            setUserIdFromReferrer: function (querystringField) {
                refreshUrl();
                businessUserId = fromQuerystring(querystringField, configReferrerUrl);
            },
            setUserIdFromCookie: function (cookieName) {
                businessUserId = cookie(cookieName);
            },
            setCollectorUrl: function (collectorUrl) {
                configCollectorUrl = asCollectorUrl(collectorUrl);
                outQueue.setCollectorUrl(configCollectorUrl);
            },
            setBufferSize: function (newBufferSize) {
                outQueue.setBufferSize(newBufferSize);
            },
            flushBuffer: function (configuration) {
                if (configuration === void 0) { configuration = {}; }
                outQueue.executeQueue();
                if (configuration.newBufferSize) {
                    outQueue.setBufferSize(configuration.newBufferSize);
                }
            },
            trackPageView: function (event) {
                if (event === void 0) { event = {}; }
                logPageView(event);
            },
            preservePageViewId: function () {
                preservePageViewId = true;
            },
            disableAnonymousTracking: function (configuration) {
                trackerConfiguration.anonymousTracking = false;
                toggleAnonymousTracking(configuration);
                initializeIdsAndCookies();
                outQueue.executeQueue(); // There might be some events in the queue we've been unable to send in anonymous mode
            },
            enableAnonymousTracking: function (configuration) {
                var _a;
                trackerConfiguration.anonymousTracking = (_a = (configuration && (configuration === null || configuration === void 0 ? void 0 : configuration.options))) !== null && _a !== void 0 ? _a : true;
                toggleAnonymousTracking(configuration);
                // Reset the page view, if not tracking the session, so can't stitch user into new events on the page view id
                if (!configAnonymousSessionTracking) {
                    resetPageView();
                }
            },
            clearUserData: clearUserDataAndCookies
        };
        return __assign(__assign({}, apiMethods), { id: trackerId, namespace: namespace, core: core, sharedState: state });
    };
    // Initialise the tracker
    var partialTracker = newTracker(trackerId, namespace, version, endpoint, sharedState, trackerConfiguration), tracker = __assign(__assign({}, partialTracker), {
        addPlugin: function (configuration) {
            var _a, _b;
            tracker.core.addPlugin(configuration);
            (_b = (_a = configuration.plugin).activateBrowserPlugin) === null || _b === void 0 ? void 0 : _b.call(_a, tracker);
        }
    });
    // Initialise each plugin with the tracker
    browserPlugins.forEach(function (p) {
        var _a;
        (_a = p.activateBrowserPlugin) === null || _a === void 0 ? void 0 : _a.call(p, tracker);
    });
    return tracker;
}

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var namedTrackers = {};
/**
 * Dispatch function to all specified trackers
 *
 * @param trackers - An optional list of trackers to send the event to, or will send to all trackers
 * @param fn - The function which will run against each tracker
 */
function dispatchToTrackers(trackers, fn) {
    try {
        getTrackers(trackers !== null && trackers !== void 0 ? trackers : allTrackerNames()).forEach(fn);
    }
    catch (ex) {
        LOG.error('Function failed', ex);
    }
}
/**
 * Dispatch function to all specified trackers from the supplied collection
 *
 * @param trackers - An optional list of trackers to send the event to, or will send to all trackers
 * @param trackerCollection - The collection which the trackers will be selected from
 * @param fn - The function which will run against each tracker
 */
function dispatchToTrackersInCollection(trackers, trackerCollection, fn) {
    try {
        getTrackersFromCollection(trackers !== null && trackers !== void 0 ? trackers : Object.keys(trackerCollection), trackerCollection).forEach(fn);
    }
    catch (ex) {
        LOG.error('Function failed', ex);
    }
}
/**
 * Checks if a tracker has been created for a particular identifier
 * @param trackerId - The unique identifier of the tracker
 */
function trackerExists(trackerId) {
    return namedTrackers.hasOwnProperty(trackerId);
}
/**
 * Creates a Tracker and adds it to the internal collection
 * @param trackerId - The unique identifier of the tracker
 * @param namespace - The namespace of the tracker, tracked with each event as `tna`
 * @param version - The current version of the tracker library
 * @param endpoint - The endpoint to send events to
 * @param sharedState - The instance of shared state to use for this tracker
 * @param configuration - The configuration to use for this tracker instance
 */
function addTracker(trackerId, namespace, version, endpoint, sharedState, configuration) {
    if (!namedTrackers.hasOwnProperty(trackerId)) {
        namedTrackers[trackerId] = Tracker(trackerId, namespace, version, endpoint, sharedState, configuration);
        return namedTrackers[trackerId];
    }
    return null;
}
/**
 * Gets a single instance of the internal tracker object
 * @param trackerId - The unique identifier of the tracker
 * @returns The tracker instance, or null if not found
 */
function getTracker(trackerId) {
    if (namedTrackers.hasOwnProperty(trackerId)) {
        return namedTrackers[trackerId];
    }
    LOG.warn(trackerId + ' not configured');
    return null;
}
/**
 * Gets an array of tracker instances based on the list of identifiers
 * @param trackerIds - An array of unique identifiers of the trackers
 * @returns The tracker instances, or empty list if none found
 */
function getTrackers(trackerIds) {
    return getTrackersFromCollection(trackerIds, namedTrackers);
}
/**
 * Gets all the trackers as a object, keyed by their unique identifiers
 */
function allTrackers() {
    return namedTrackers;
}
/**
 * Returns all the unique tracker identifiers
 */
function allTrackerNames() {
    return Object.keys(namedTrackers);
}
function getTrackersFromCollection(trackerIds, trackerCollection) {
    var trackers = [];
    for (var _i = 0, trackerIds_1 = trackerIds; _i < trackerIds_1.length; _i++) {
        var id = trackerIds_1[_i];
        if (trackerCollection.hasOwnProperty(id)) {
            trackers.push(trackerCollection[id]);
        }
        else {
            LOG.warn(id + ' not configured');
        }
    }
    return trackers;
}

/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * A set of variables which are shared among all initialised trackers
 */
var SharedState = /** @class */ (function () {
    function SharedState() {
        /* List of request queues - one per Tracker instance */
        this.outQueues = [];
        this.bufferFlushers = [];
        /* DOM Ready */
        this.hasLoaded = false;
        this.registeredOnLoadHandlers = [];
    }
    return SharedState;
}());
function createSharedState() {
    var sharedState = new SharedState(), documentAlias = document, windowAlias = window;
    /*
     * Handle page visibility event
     * Works everywhere except IE9
     */
    function visibilityChangeHandler() {
        if (documentAlias.visibilityState == 'hidden') {
            // Flush all POST queues
            sharedState.bufferFlushers.forEach(function (flusher) {
                flusher(false);
            });
        }
    }
    function flushBuffers() {
        // Flush all POST queues
        sharedState.bufferFlushers.forEach(function (flusher) {
            flusher(false);
        });
    }
    /*
     * Handler for onload event
     */
    function loadHandler() {
        var i;
        if (!sharedState.hasLoaded) {
            sharedState.hasLoaded = true;
            for (i = 0; i < sharedState.registeredOnLoadHandlers.length; i++) {
                sharedState.registeredOnLoadHandlers[i]();
            }
        }
        return true;
    }
    /*
     * Add onload or DOM ready handler
     */
    function addReadyListener() {
        if (documentAlias.addEventListener) {
            documentAlias.addEventListener('DOMContentLoaded', function ready() {
                documentAlias.removeEventListener('DOMContentLoaded', ready, false);
                loadHandler();
            });
        }
        else if (documentAlias.attachEvent) {
            documentAlias.attachEvent('onreadystatechange', function ready() {
                if (documentAlias.readyState === 'complete') {
                    documentAlias.detachEvent('onreadystatechange', ready);
                    loadHandler();
                }
            });
        }
        // fallback
        addEventListener(windowAlias, 'load', loadHandler, false);
    }
    /************************************************************
     * Constructor
     ************************************************************/
    // initialize the Snowplow singleton
    if (documentAlias.visibilityState) {
        // Flush for mobile and modern browsers
        addEventListener(documentAlias, 'visibilitychange', visibilityChangeHandler, false);
    }
    // Last attempt at flushing in beforeunload
    addEventListener(windowAlias, 'beforeunload', flushBuffers, false);
    if (document.readyState === 'loading') {
        addReadyListener();
    }
    else {
        loadHandler();
    }
    return sharedState;
}

export { SharedState, addEventListener, addTracker, allTrackerNames, allTrackers, attemptDeleteLocalStorage, attemptGetLocalStorage, attemptGetSessionStorage, attemptWriteLocalStorage, attemptWriteSessionStorage, cookie, createSharedState, decorateQuerystring, deleteCookie, dispatchToTrackers, dispatchToTrackersInCollection, findRootDomain, fixupDomain, fixupTitle, fixupUrl, fromQuerystring, getCookiesWithPrefix, getCssClasses, getFilterByClass, getFilterByName, getHostName, getReferrer, getTracker, getTrackers, hasLocalStorage, hasSessionStorage, isFunction, isInteger, isString, isValueInArray, localStorageAccessible, parseAndValidateFloat, parseAndValidateInt, trackerExists };
//# sourceMappingURL=index.module.js.map
