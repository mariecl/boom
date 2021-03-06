'use strict';

// Load modules

const Code = require('code');
const Boom = require('../lib');
const Lab = require('lab');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


it('returns the same object when already boom', (done) => {

    const error = Boom.badRequest();
    expect(error).to.equal(Boom.wrap(error));
    expect(error).to.equal(Boom.wrap(error, null, null));
    done();
});

it('errors on wrap with boom error and additional arguments', (done) => {

    const error = Boom.badRequest('Something');
    expect(() => Boom.wrap(error, 401)).to.throw('Cannot provide statusCode or message with boom error');
    expect(() => Boom.wrap(error, 402, 'Else')).to.throw('Cannot provide statusCode or message with boom error');
    expect(() => Boom.wrap(error, undefined, 'Else')).to.throw('Cannot provide statusCode or message with boom error');
    done();
});

it('returns an error with info when constructed using another error', (done) => {

    const error = new Error('ka-boom');
    error.xyz = 123;
    const err = Boom.wrap(error);
    expect(err.xyz).to.equal(123);
    expect(err.message).to.equal('ka-boom');
    expect(err.output).to.equal({
        statusCode: 500,
        payload: {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An internal server error occurred'
        },
        headers: {}
    });
    expect(err.data).to.equal(null);
    done();
});

it('does not override data when constructed using another error', (done) => {

    const error = new Error('ka-boom');
    error.data = { useful: 'data' };
    const err = Boom.wrap(error);
    expect(err.data).to.equal(error.data);
    done();
});

it('sets new message when none exists', (done) => {

    const error = new Error();
    const wrapped = Boom.wrap(error, 400, 'something bad');
    expect(wrapped.message).to.equal('something bad');
    done();
});

it('throws when statusCode is not a number', (done) => {

    expect(() => {

        Boom.create('x');
    }).to.throw('First argument must be a number (400+): x');
    done();
});

it('will cast a number-string to an integer', (done) => {

    const codes = [
        { input: '404', result: 404 },
        { input: '404.1', result: 404 },
        { input: 400, result: 400 },
        { input: 400.123, result: 400 }
    ];

    for (let i = 0; i < codes.length; ++i) {
        const code = codes[i];
        const err = Boom.create(code.input);
        expect(err.output.statusCode).to.equal(code.result);
    }

    done();
});

it('throws when statusCode is not finite', (done) => {

    expect(() => {

        Boom.create(1 / 0);
    }).to.throw('First argument must be a number (400+): null');
    done();
});

it('sets error code to unknown', (done) => {

    const err = Boom.create(999);
    expect(err.output.payload.error).to.equal('Unknown');
    done();
});

describe('create()', () => {

    it('does not sets null message', (done) => {

        const error = Boom.unauthorized(null);
        expect(error.output.payload.message).to.equal('Unauthorized');
        expect(error.isServer).to.be.false();
        done();
    });

    it('sets message and data', (done) => {

        const error = Boom.badRequest('Missing data', { type: 'user' });
        expect(error.data.type).to.equal('user');
        expect(error.output.payload.message).to.equal('Missing data');
        done();
    });
});

describe('initialize()', () => {

    it('does not sets null message', (done) => {

        const err = new Error('some error message');
        const boom = Boom.wrap(err, 400, 'modified error message');
        expect(boom.output.payload.message).to.equal('modified error message: some error message');
        done();
    });
});

describe('isBoom()', () => {

    it('returns true for Boom object', (done) => {

        expect(Boom.badRequest().isBoom).to.equal(true);
        done();
    });

    it('returns false for Error object', (done) => {

        expect((new Error()).isBoom).to.not.exist();
        done();
    });
});

describe('badRequest()', () => {

    it('returns a 400 error statusCode', (done) => {

        const error = Boom.badRequest();

        expect(error.output.statusCode).to.equal(400);
        expect(error.isServer).to.be.false();
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.badRequest('my message').message).to.equal('my message');
        done();
    });

    it('sets the message to HTTP status if none provided', (done) => {

        expect(Boom.badRequest().message).to.equal('Bad Request');
        done();
    });
});

describe('unauthorized()', () => {

    it('returns a 401 error statusCode', (done) => {

        const err = Boom.unauthorized();
        expect(err.output.statusCode).to.equal(401);
        expect(err.output.headers).to.equal({});
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.unauthorized('my message').message).to.equal('my message');
        done();
    });

    it('returns a WWW-Authenticate header when passed a scheme', (done) => {

        const err = Boom.unauthorized('boom', 'Test');
        expect(err.output.statusCode).to.equal(401);
        expect(err.output.headers['WWW-Authenticate']).to.equal('Test error="boom"');
        done();
    });

    it('returns a WWW-Authenticate header set to the schema array value', (done) => {

        const err = Boom.unauthorized(null, ['Test', 'one', 'two']);
        expect(err.output.statusCode).to.equal(401);
        expect(err.output.headers['WWW-Authenticate']).to.equal('Test, one, two');
        done();
    });

    it('returns a WWW-Authenticate header when passed a scheme and attributes', (done) => {

        const err = Boom.unauthorized('boom', 'Test', { a: 1, b: 'something', c: null, d: 0 });
        expect(err.output.statusCode).to.equal(401);
        expect(err.output.headers['WWW-Authenticate']).to.equal('Test a="1", b="something", c="", d="0", error="boom"');
        expect(err.output.payload.attributes).to.equal({ a: 1, b: 'something', c: '', d: 0, error: 'boom' });
        done();
    });

    it('returns a WWW-Authenticate header from string input instead of object', (done) => {

        const err = Boom.unauthorized(null, 'Negotiate', 'VGhpcyBpcyBhIHRlc3QgdG9rZW4=');
        expect(err.output.statusCode).to.equal(401);
        expect(err.output.headers['WWW-Authenticate']).to.equal('Negotiate VGhpcyBpcyBhIHRlc3QgdG9rZW4=');
        expect(err.output.payload.attributes).to.equal('VGhpcyBpcyBhIHRlc3QgdG9rZW4=');
        done();
    });

    it('returns a WWW-Authenticate header when passed attributes, missing error', (done) => {

        const err = Boom.unauthorized(null, 'Test', { a: 1, b: 'something', c: null, d: 0 });
        expect(err.output.statusCode).to.equal(401);
        expect(err.output.headers['WWW-Authenticate']).to.equal('Test a="1", b="something", c="", d="0"');
        expect(err.isMissing).to.equal(true);
        done();
    });

    it('sets the isMissing flag when error message is empty', (done) => {

        const err = Boom.unauthorized('', 'Basic');
        expect(err.isMissing).to.equal(true);
        done();
    });

    it('does not set the isMissing flag when error message is not empty', (done) => {

        const err = Boom.unauthorized('message', 'Basic');
        expect(err.isMissing).to.equal(undefined);
        done();
    });

    it('sets a WWW-Authenticate when passed as an array', (done) => {

        const err = Boom.unauthorized('message', ['Basic', 'Example e="1"', 'Another x="3", y="4"']);
        expect(err.output.headers['WWW-Authenticate']).to.equal('Basic, Example e="1", Another x="3", y="4"');
        done();
    });
});


describe('paymentRequired()', () => {

    it('returns a 402 error statusCode', (done) => {

        expect(Boom.paymentRequired().output.statusCode).to.equal(402);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.paymentRequired('my message').message).to.equal('my message');
        done();
    });

    it('sets the message to HTTP status if none provided', (done) => {

        expect(Boom.paymentRequired().message).to.equal('Payment Required');
        done();
    });
});


describe('methodNotAllowed()', () => {

    it('returns a 405 error statusCode', (done) => {

        expect(Boom.methodNotAllowed().output.statusCode).to.equal(405);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.methodNotAllowed('my message').message).to.equal('my message');
        done();
    });

    it('returns an Allow header when passed a string', (done) => {

        const err = Boom.methodNotAllowed('my message', null, 'GET');
        expect(err.output.statusCode).to.equal(405);
        expect(err.output.headers.Allow).to.equal('GET');
        done();
    });

    it('returns an Allow header when passed an array', (done) => {

        const err = Boom.methodNotAllowed('my message', null, ['GET', 'POST']);
        expect(err.output.statusCode).to.equal(405);
        expect(err.output.headers.Allow).to.equal('GET, POST');
        done();
    });
});


describe('notAcceptable()', () => {

    it('returns a 406 error statusCode', (done) => {

        expect(Boom.notAcceptable().output.statusCode).to.equal(406);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.notAcceptable('my message').message).to.equal('my message');
        done();
    });
});


describe('proxyAuthRequired()', () => {

    it('returns a 407 error statusCode', (done) => {

        expect(Boom.proxyAuthRequired().output.statusCode).to.equal(407);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.proxyAuthRequired('my message').message).to.equal('my message');
        done();
    });
});


describe('clientTimeout()', () => {

    it('returns a 408 error statusCode', (done) => {

        expect(Boom.clientTimeout().output.statusCode).to.equal(408);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.clientTimeout('my message').message).to.equal('my message');
        done();
    });
});


describe('conflict()', () => {

    it('returns a 409 error statusCode', (done) => {

        expect(Boom.conflict().output.statusCode).to.equal(409);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.conflict('my message').message).to.equal('my message');
        done();
    });
});


describe('resourceGone()', () => {

    it('returns a 410 error statusCode', (done) => {

        expect(Boom.resourceGone().output.statusCode).to.equal(410);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.resourceGone('my message').message).to.equal('my message');
        done();
    });
});


describe('lengthRequired()', () => {

    it('returns a 411 error statusCode', (done) => {

        expect(Boom.lengthRequired().output.statusCode).to.equal(411);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.lengthRequired('my message').message).to.equal('my message');
        done();
    });
});


describe('preconditionFailed()', () => {

    it('returns a 412 error statusCode', (done) => {

        expect(Boom.preconditionFailed().output.statusCode).to.equal(412);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.preconditionFailed('my message').message).to.equal('my message');
        done();
    });
});


describe('entityTooLarge()', () => {

    it('returns a 413 error statusCode', (done) => {

        expect(Boom.entityTooLarge().output.statusCode).to.equal(413);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.entityTooLarge('my message').message).to.equal('my message');
        done();
    });
});


describe('uriTooLong()', () => {

    it('returns a 414 error statusCode', (done) => {

        expect(Boom.uriTooLong().output.statusCode).to.equal(414);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.uriTooLong('my message').message).to.equal('my message');
        done();
    });
});


describe('unsupportedMediaType()', () => {

    it('returns a 415 error statusCode', (done) => {

        expect(Boom.unsupportedMediaType().output.statusCode).to.equal(415);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.unsupportedMediaType('my message').message).to.equal('my message');
        done();
    });
});


describe('rangeNotSatisfiable()', () => {

    it('returns a 416 error statusCode', (done) => {

        expect(Boom.rangeNotSatisfiable().output.statusCode).to.equal(416);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.rangeNotSatisfiable('my message').message).to.equal('my message');
        done();
    });
});


describe('expectationFailed()', () => {

    it('returns a 417 error statusCode', (done) => {

        expect(Boom.expectationFailed().output.statusCode).to.equal(417);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.expectationFailed('my message').message).to.equal('my message');
        done();
    });
});


describe('teapot()', () => {

    it('returns a 418 error statusCode', (done) => {

        expect(Boom.teapot().output.statusCode).to.equal(418);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.teapot('Sorry, no coffee...').message).to.equal('Sorry, no coffee...');
        done();
    });
});


describe('badData()', () => {

    it('returns a 422 error statusCode', (done) => {

        expect(Boom.badData().output.statusCode).to.equal(422);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.badData('my message').message).to.equal('my message');
        done();
    });
});


describe('locked()', () => {

    it('returns a 423 error statusCode', (done) => {

        expect(Boom.locked().output.statusCode).to.equal(423);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.locked('my message').message).to.equal('my message');
        done();
    });
});


describe('preconditionRequired()', () => {

    it('returns a 428 error statusCode', (done) => {

        expect(Boom.preconditionRequired().output.statusCode).to.equal(428);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.preconditionRequired('my message').message).to.equal('my message');
        done();
    });
});


describe('tooManyRequests()', () => {

    it('returns a 429 error statusCode', (done) => {

        expect(Boom.tooManyRequests().output.statusCode).to.equal(429);
        done();
    });

    it('sets the message with the passed-in message', (done) => {

        expect(Boom.tooManyRequests('my message').message).to.equal('my message');
        done();
    });
});


describe('illegal()', () => {

    it('returns a 451 error statusCode', (done) => {

        expect(Boom.illegal().output.statusCode).to.equal(451);
        done();
    });

    it('sets the message with the passed-in message', (done) => {

        expect(Boom.illegal('my message').message).to.equal('my message');
        done();
    });
});

describe('serverUnavailable()', () => {

    it('returns a 503 error statusCode', (done) => {

        expect(Boom.serverUnavailable().output.statusCode).to.equal(503);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.serverUnavailable('my message').message).to.equal('my message');
        done();
    });
});

describe('forbidden()', () => {

    it('returns a 403 error statusCode', (done) => {

        expect(Boom.forbidden().output.statusCode).to.equal(403);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.forbidden('my message').message).to.equal('my message');
        done();
    });
});

describe('notFound()', () => {

    it('returns a 404 error statusCode', (done) => {

        expect(Boom.notFound().output.statusCode).to.equal(404);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.notFound('my message').message).to.equal('my message');
        done();
    });
});

describe('internal()', () => {

    it('returns a 500 error statusCode', (done) => {

        expect(Boom.internal().output.statusCode).to.equal(500);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        const err = Boom.internal('my message');
        expect(err.message).to.equal('my message');
        expect(err.isServer).to.true();
        expect(err.output.payload.message).to.equal('An internal server error occurred');
        done();
    });

    it('passes data on the callback if its passed in', (done) => {

        expect(Boom.internal('my message', { my: 'data' }).data.my).to.equal('data');
        done();
    });

    it('returns an error with composite message', (done) => {

        try {
            x.foo();
        }
        catch (err) {
            const boom = Boom.internal('Someting bad', err);
            expect(boom.message).to.equal('Someting bad: x is not defined');
            expect(boom.isServer).to.be.true();
            done();
        }
    });
});

describe('notImplemented()', () => {

    it('returns a 501 error statusCode', (done) => {

        expect(Boom.notImplemented().output.statusCode).to.equal(501);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.notImplemented('my message').message).to.equal('my message');
        done();
    });
});

describe('badGateway()', () => {

    it('returns a 502 error statusCode', (done) => {

        expect(Boom.badGateway().output.statusCode).to.equal(502);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.badGateway('my message').message).to.equal('my message');
        done();
    });

    it('retains source boom error as data when wrapped', (done) => {

        const upstream = Boom.serverUnavailable();
        const boom = Boom.badGateway('Upstream error', upstream);
        expect(boom.output.statusCode).to.equal(502);
        expect(boom.data).to.equal(upstream);
        done();
    });
});

describe('gatewayTimeout()', () => {

    it('returns a 504 error statusCode', (done) => {

        expect(Boom.gatewayTimeout().output.statusCode).to.equal(504);
        done();
    });

    it('sets the message with the passed in message', (done) => {

        expect(Boom.gatewayTimeout('my message').message).to.equal('my message');
        done();
    });
});

describe('badImplementation()', () => {

    it('returns a 500 error statusCode', (done) => {

        const err = Boom.badImplementation();
        expect(err.output.statusCode).to.equal(500);
        expect(err.isDeveloperError).to.equal(true);
        expect(err.isServer).to.be.true();
        done();
    });

    it('hides error from user when error data is included', (done) => {

        const err = Boom.badImplementation('Invalid', new Error('kaboom'));
        expect(err.output).to.equal({
            headers: {},
            statusCode: 500,
            payload: {
                error: 'Internal Server Error',
                message: 'An internal server error occurred',
                statusCode: 500
            }
        });
        done();
    });

    it('hides error from user when error data is included (boom)', (done) => {

        const err = Boom.badImplementation('Invalid', Boom.badRequest('kaboom'));
        expect(err.output).to.equal({
            headers: {},
            statusCode: 500,
            payload: {
                error: 'Internal Server Error',
                message: 'An internal server error occurred',
                statusCode: 500
            }
        });
        done();
    });
});

describe('stack trace', () => {

    it('should omit lib', (done) => {

        ['badRequest', 'unauthorized', 'forbidden', 'notFound', 'methodNotAllowed',
            'notAcceptable', 'proxyAuthRequired', 'clientTimeout', 'conflict',
            'resourceGone', 'lengthRequired', 'preconditionFailed', 'entityTooLarge',
            'uriTooLong', 'unsupportedMediaType', 'rangeNotSatisfiable', 'expectationFailed',
            'badData', 'preconditionRequired', 'tooManyRequests',

            // 500s
            'internal', 'notImplemented', 'badGateway', 'serverUnavailable',
            'gatewayTimeout', 'badImplementation'
        ].forEach((name) => {

            const err = Boom[name]();
            expect(err.stack).to.not.match(/\/lib\/index\.js/);
        });

        done();
    });
});

describe('method with error object instead of message', () => {

    [
        'badRequest',
        'unauthorized',
        'forbidden',
        'notFound',
        'methodNotAllowed',
        'notAcceptable',
        'proxyAuthRequired',
        'clientTimeout',
        'conflict',
        'resourceGone',
        'lengthRequired',
        'preconditionFailed',
        'entityTooLarge',
        'uriTooLong',
        'unsupportedMediaType',
        'rangeNotSatisfiable',
        'expectationFailed',
        'badData',
        'preconditionRequired',
        'tooManyRequests',
        'internal',
        'notImplemented',
        'badGateway',
        'serverUnavailable',
        'gatewayTimeout',
        'badImplementation'
    ].forEach((name) => {

        it(`should allow \`Boom${name}(err)\` and preserve the error`, (done) => {

            const error = new Error('An example mongoose validation error');
            error.name = 'ValidationError';
            const err = Boom[name](error);
            expect(err.name).to.equal('ValidationError');
            expect(err.message).to.equal('An example mongoose validation error');
            done();
        });

        // exclude unauthorized

        if (name !== 'unauthorized') {

            it(`should allow \`Boom.${name}(err, data)\` and preserve the data`, (done) => {

                const error = new Error();
                const err = Boom[name](error, { foo: 'bar' });
                expect(err.data).to.equal({ foo: 'bar' });
                done();
            });
        }
    });
});

describe('error.typeof', () => {

    const types = [
        'badRequest',
        'unauthorized',
        'forbidden',
        'notFound',
        'methodNotAllowed',
        'notAcceptable',
        'proxyAuthRequired',
        'clientTimeout',
        'conflict',
        'resourceGone',
        'lengthRequired',
        'preconditionFailed',
        'entityTooLarge',
        'uriTooLong',
        'unsupportedMediaType',
        'rangeNotSatisfiable',
        'expectationFailed',
        'badData',
        'preconditionRequired',
        'tooManyRequests',
        'internal',
        'notImplemented',
        'badGateway',
        'serverUnavailable',
        'gatewayTimeout',
        'badImplementation'
    ];

    types.forEach((name) => {

        it(`matches typeof Boom.${name}`, (done) => {

            const error = Boom[name]();
            types.forEach((type) => {

                if (type === name) {
                    expect(error.typeof).to.equal(Boom[name]);
                }
                else {
                    expect(error.typeof).to.not.equal(Boom[type]);
                }
            });

            done();
        });
    });
});
