---
title: Simplify testing async I/O in javascript
date: '2019-04-12T10:00:00.000Z'
description: How to write declarative side-effects
---

Testing asynchronous I/O sucks. Interacting with the external world, whether
it's a database, a remote HTTP server, or the filesystem, it requires mocking
what we expect will happen. Sometimes these mocks are rather difficult to
construct because some functionality was never intended to be mocked. We have to
consider the idea that mocks are code as well and every testing suite has a
different way to construct them. It also involves understanding how that IO
behaves in order to understand all of its responses.

When we write tests, we naturally gravitate towards testing the easy sets of
code first. Coincidentally these are the areas that have relatively low impact.
The urge to test pure functions, like ones that accept a string and return
another string without side-effects is strong because they are easy to test. The
goal of this article is to demonstrate that some of the most difficult things to
test (async IO) can become just as easy to test as pure functions.

---

**How would we test the function `fetchAndSaveMovie`?**

```js
// version 1
const fs = require('fs');
const fetch = require('fetch');

function writeFile(fname, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fname, data, (err) => {
      if (err) {
        reject(err);
      }

      resolve(`saved ${fname}`);
    });
  });
}

function fetchAndSaveMovie(id) {
  return fetch(`http://localhost/movies/${id}`)
    .then((resp) => {
      if (resp.status !== 200) {
        throw new Error('request unsuccessful');
      }

      return resp;
    })
    .then((resp) => resp.json())
    .then((movie) => {
      const data = JSON.stringify(movie, null, 2);
      const fname = 'movie.json';
      return writeFile(fname, data);
    });
}

fetchAndSaveMovie('1').then(console.log).catch(console.error);
```

Reading the code we are doing the following:

1. Downloading a movie of `id`
2. Once we get the response we then check to see if the request was successful
3. If the request was unsuccessful, we throw an error
4. If the request was successful, we convert the response to JSON
5. Then we save the json to a file and return a success or failure

It seems simple but there are a couple points of failure that need to be
accounted for as well as doing the necessary operations to save the data to a
file.

For me the best way to test this would be to use a library like
[nock](https://github.com/nock/nock) which will intercept HTTP requests and
return a desired response.

```js
// version 1 test
const nock = require('nock');

test('when request is 500', () => {
  nock(/localhost/)
    .get('/movies/1')
    .reply(500, {
      error: 'something happened',
    });
  const fn = require('./index');

  return expect(fn('1')).rejects.toThrow('request unsuccessful');
});

describe('when the request is 200', () => {
  beforeEach(() => jest.resetModules());

  test('when saving the file fails', () => {
    nock(/localhost/)
      .get('/movies/1')
      .reply(200, {
        name: 'a movie',
      });

    jest.mock('fs', () => {
      return {
        writeFile: (f, d, cb) => {
          cb('some error');
        },
      };
    });
    const fn = require('./index');

    return expect(fn('1')).rejects.toBe('some error');
  });

  test('when saving the file succeeds', () => {
    nock(/localhost/)
      .get('/movies/1')
      .reply(200, {
        name: 'a movie',
      });

    jest.mock('fs', () => {
      return {
        writeFile: (f, d, cb) => {
          cb();
        },
      };
    });
    const fn = require('./index');

    return expect(fn('1')).resolves.toBe('saved movie.json');
  });
});
```

In these tests we had to figure out how to intercept all the HTTP requests. Then
we needed to figure out how to mock the `fs` module. This turned out to be
tricky, because `writeFile` uses a callback which was hard to automatically mock
using jest.

In a perfect world, our function wouldn't have side-effects at all. What if we
could test this function synchronously without having to intercept HTTP requests
and mock `fs`? The key to solving this puzzle is to create a function that
returns JSON which will describe how to initiate the side-effects instead of the
function itself initiating the side-effects.

This technique is very popular, a relavent example is `react`. Testing react
components is easy because the components are functions that accept state and
then return data as HTML.

```js
const view = f(state);
```

The **functions** themselves do not _mutate_ the DOM, they tell the **react
runtime** how to _mutate_ the DOM. This is a critical distinction and pivotal
for understanding how this works. Effectively the end-developer only concerns
itself with the shape of the data being returned from their react components and
the react runtime does the rest.

[cofx](https://github.com/neurosnap/cofx) employs the same concept but for async
IO operations. This library will allow the end-developer to write declarative
functions that only return JSON objects. These JSON objects instruct the `cofx`
runtime how to activate the side-effects.

Instead of `fetchMovie` calling `fetch` and `fs.writeFile` it simply describes
how to call those functions and `cofx` _handles_ the rest.

---

## cofx

[cofx](https://github.com/neurosnap/cofx) is a way to declaratively write
asynchronous IO code in a synchronous way. It leverages the flow control of
generators and makes testing even the most complex async IO relatively straight
forward. `cofx` works both in node and in the browser.

```js
// version 2
const fetch = require('node-fetch');
const { task, call } = require('cofx');

function* fetchAndSaveMovie(id) {
  const resp = yield call(fetch, `http://localhost/movies/${id}`);
  if (resp.status !== 200) {
    throw new Error('request unsuccessful');
  }

  // resp.json() needs proper context `this`
  // from fetch to work which requires special execution
  const movie = yield call([resp, 'json']);
  const data = JSON.stringify(movie, null, 2);
  const fname = 'movie.json';

  let msg = '';
  try {
    yield call(writeFile, fname, data);
    msg = `saved ${fname}`;
  } catch (err) {
    msg = err;
  }

  return msg;
}

task(fetchAndSaveMovie, '1').then(console.log).catch(console.error);
```

The first thing to note is how flat the function has become. The original
function has a max of 4 levels of indentation. The generator-based function has
a max of 2 levels of indentation. Code has a visual design that is important for
readability.

> flat is better than nested (zen of python)

I'm not going to go into the specifics of how generators work, but the gist is
that the code looks synchronous but it behaves asynchrounously.

The key thing to note here is that the only thing we are actually calling inside
this function is `call`. It is a function that returns JSON which is an
instruction that `cofx` can read and understand how to execute. If we aggregated
all the `yield` results in this function it would be a sequence of JSON objects.
This is the magic of `cofx`. Instead of activating side-effects inside this
function, we let `cofx` do that and only describe how the side-effects ought to
be executed.

Here is what `call` returns:

```js
{
  "type": "CALL",
  "fn": [function],
  "args": ["list", "of", "arguments"]
}
```

Testing this function is just a matter of stepping through each `yield`
statement synchronously. Later on I will demonstrate how to simplify this even
more with `gen-tester`. Here is a simple, but still rather vebose way of testing
this function:

```js
// version 2 test
test('when request is 500', () => {
  const gen = fetchAndSaveMovie2('1');
  gen.next(); // fetch
  const t = () => gen.next({ status: 500 });
  expect(t).toThrow('request unsuccessful');
});

describe('when the request is 200', () => {
  test('when saving the file fails', () => {
    const gen = fetchAndSaveMovie2('1');
    gen.next(); // fetch
    gen.next({ status: 200 }); // json
    gen.next({ name: 'Lord of the Rings' }); // writeFile
    const val = gen.throw('some error'); // return value
    expect(val).toEqual({
      done: true,
      value: 'some error',
    });
  });

  test('when saving the file succeeds', () => {
    const gen = fetchAndSaveMovie2('1');
    gen.next(); // fetch
    gen.next({ status: 200 }); // json
    gen.next({ name: 'Lord of the Rings' }); // writeFile
    const val = gen.next(); // return value
    expect(val).toEqual({
      done: true,
      value: 'saved movie.json',
    });
  });
});
```

As you can see there are no promises to handle, there are no HTTP interceptors
to write, and most importantly we don't have to mock `fs`. We have completely
removed all the headache of testing async IO and are able to test our code
synchronously.

So it's nice that we can test the function without all of the scaffolding in our
first example, but what if we want to test that when we pass in `1` to our
function it properly constructs the http request?

Because our function yields JSON objects we can check to see if they match what
we are expecting.

```js
test('when request is 500 - verbose', () => {
  const gen = fetchAndSaveMovie2('1');
  expect(gen.next()).toEqual({
    done: false,
    value: call(fetch, 'http://localhost/movies/1'),
  }); // fetch
  const t = () => gen.next({ status: 500 });
  expect(t).toThrow('request unsuccessful');
});

describe('when the request is 200 - verbose', () => {
  test('when saving the file fails', () => {
    const gen = fetchAndSaveMovie2('2');
    expect(gen.next()).toEqual({
      done: false,
      value: call(fetch, 'http://localhost/movies/2'),
    });
    const resp = { status: 200 };
    expect(gen.next(resp)).toEqual({
      done: false,
      value: call([resp, 'json']),
    });
    const data = { name: 'Lord of the Rings' };
    expect(gen.next(data)).toEqual({
      done: false,
      value: call(writeFile, 'movie.json', JSON.stringify(data, null, 2)),
    });
    const val = gen.throw('some error'); // return value
    expect(val).toEqual({
      done: true,
      value: 'some error',
    });
  });

  test('when saving the file succeeds', () => {
    const gen = fetchAndSaveMovie2('3');
    expect(gen.next()).toEqual({
      done: false,
      value: call(fetch, 'http://localhost/movies/3'),
    });
    const resp = { status: 200 };
    expect(gen.next(resp)).toEqual({
      done: false,
      value: call([resp, 'json']),
    });
    const data = { name: 'Lord of the Rings' };
    expect(gen.next(data)).toEqual({
      done: false,
      value: call(writeFile, 'movie.json', JSON.stringify(data, null, 2)),
    });
    const val = gen.next();
    expect(val).toEqual({
      done: true,
      value: 'saved movie.json',
    });
  });
});
```

After each step we are able to confirm that we are getting the correct response
from each yield.

Matching yields with expected values is a little confusing. You have to know
when to mock the return value from a yield at the right `gen.next` which is a
tedious endeavor and error prone. Instead we can leverage a library like
[gen-tester](https://github.com/neurosnap/gen-tester) to line up the yields and
their response values properly. This library adds a nicer API to deal with
testing generators.

---

## gen-tester

[gen-tester](https://github.com/neurosnap/gen-tester) is a small API for testing
generators.

```js
const { call } = require('cofx');
const {
  genTester,
  yields,
  throws,
  finishes,
  stepsToBeEqual,
} = require('gen-tester');
const fetch = require('node-fetch');

expect.extend({
  stepsToBeEqual,
});

test('when request is 500 - verbose', () => {
  const tester = genTester(fetchAndSaveMovie, '1');
  const actual = tester(
    yields(call(fetch, 'http://localhost/movies/1'), {
      status: 500,
    }),
    throws((err) => err.message === 'request unsuccessful'),
    finishes(),
  );

  expect(actual).stepsToBeEqual();
});

describe('when the request is 200 - gen-tester', () => {
  test('when saving the file fails', () => {
    const tester = genTester(fetchAndSaveMovie, '1');
    const resp = { status: 200 };
    const data = { name: 'Lord of the Rings' };
    const actual = tester(
      yields(call(fetch, 'http://localhost/movies/1'), resp),
      yields(call([resp, 'json']), data),
      yields(
        call(writeFile, 'movie.json', JSON.stringify(data, null, 2)),
        throws('some error'),
      ),
      finishes('some error'),
    );

    expect(actual).stepsToBeEqual();
  });

  test('when saving the file succeeds', () => {
    const tester = genTester(fetchAndSaveMovie, '1');
    const resp = { status: 200 };
    const data = { name: 'Lord of the Rings' };
    const actual = tester(
      yields(call(fetch, 'http://localhost/movies/1'), resp),
      yields(call([resp, 'json']), data),
      call(writeFile, 'movie.json', JSON.stringify(data, null, 2)),
      finishes('saved movie.json'),
    );

    expect(actual).stepsToBeEqual();
  });
});
```

Don't care about checking all the `call`s for a test?

```js
const { genTester, skip, finishes, throws } = require('gen-tester');

test('when request is 500 - verbose', () => {
  const tester = genTester(fetchAndSaveMovie, '1');
  const actual = tester(
    skip({ status: 500 }),
    throws((err) => err.message === 'request unsuccessful'),
    finishes(),
  );

  expect(actual).stepsToBeEqual();
});
```

---

So what have we accomplished? Using two relatively small libraries, we were able
to describe side-effects as data which vastly improves both readability and
testability.

## references

- [code samples for this article](https://github.com/neurosnap/blog/tree/master/simplify-testing-async-io-in-javascript)
- [effects as data](https://www.youtube.com/watch?v=6EdXaWfoslc)
- [redux-saga](https://redux-saga.js.org/)

## cofx ecosystem

- [cofx](https://github.com/neurosnap/cofx)
- [gen-tester](https://github.com/neurosnap/gen-tester)
- [use-cofx](https://github.com/neurosnap/use-cofx)
- [redux-cofx](https://github.com/neurosnap/redux-cofx)
- [redux-router-cofx](https://github.com/neurosnap/redux-router-cofx)
