---
title: 3 Rules for Refactoring Functions
date: '2019-07-11T10:00:00.000Z'
description: Simple steps to guarantee cleaner functions
---

1. Return early
2. Return often
3. Reduce levels of nesting

These rules are the heartbeat to how I write code. Whenever I write a function
there is nothing more important for readability and maintainability. Whenever I
approach a function that needs be refactored it's because the function did not
subscribe to these rules.

Let's try to build a function that lets a user sign up for our service:

```js
interface Response {
  type: 'success' | 'error';
  payload: any;
}

function register(email: string, pass: string): Response {
  if (isEmailValid(email) && isEmailAvailable(email)) {
    if (isPassValid(pass)) {
      const userId = createUser(email, pass);
      return {
        type: 'success',
        payload: { userId },
      };
    } else {
      return {
        type: 'error',
        payload: 'password must be 8 characters long',
      };
    }
  } else {
    return {
      type: 'error',
      payload: 'email is invalid',
    };
  }

  return {
    type: 'error',
    payload: 'unknown error occurred',
  };
}
```

All the named functions are stubs, the actual implementation is irrelevant to
this demonstration. Before we can create the user, we need to make sure that the
email and password provided to us are valid and the email address has not
already been created. There are a couple issues with the current code that can
be improved. First, the main purpose of the function's code is nested within
multiple `if-statements`. This makes it harder to understand how a function's
core _responsibility_ gets activated. Because we want to return meaninful errors
in this function, we have to create accompanying `else-statements` which are not
co-located next to the logic that controls them and makes them hard to read.
_Max indendation is 4_.

## Return early

The general idea is to figure out all the ways to exit a function as quickly as
possible. This reduces cognitive overhead when reading a function. When you are
hunting a bug and a function returns early for your use-case, you can move on
quickly because you avoid the cognitive load required to understand the rest of
the function.

```js
function register(email: string, pass: string): Response {
  if (!isEmailValid(email) || !isEmailAvailable(email) || !isPassValid(pass)) {
    return {
      type: 'error',
      payload: 'validation failed',
    };
  }

  const userId = createUser(email, pass);
  return {
    type: 'success',
    payload: { userId },
  };
}
```

This seems better. We have removed the need to read all the code when we know
our email or pass is invalid. The `if-statement`/`else-statement` separation in
the previous example is gone: the condition is co-located with the error state.
Also the primary goal of the function's code is in the main body of the
function. However, we lost something in this iteration: meaningful error
messages. We no longer know what piece of validation failed because they are all
inside one `if-statement`. _Max indentation is 3_.

## Return often

Don't wait until the end of a function to return. Based on experience, waiting
until the end to return from a function ends up creating a lot of branching
logic that a developer has to keep track of in their head when traversing a
function's code.

```js
function register(email: string, pass: string): Response {
  if (!isEmailValid(email) || !isEmailAvailable(email)) {
    return {
      type: 'error',
      payload: 'email is invalid',
    };
  }

  if (!isPassValid(pass)) {
    return {
      type: 'error',
      payload: 'password must be 8 characters long',
    };
  }

  const userId = createUser(email, pass);
  return {
    type: 'success',
    payload: { userId },
  };
}
```

Now we have separated the email validation from the password validation and have
better error messages by returning early and often. This is clear to understand
and at each step of the function we filter out parameters that would prevent the
core of our function from running. However, there are still some improvements we
could make. We have an `if-statement` that requires two condititions to be met
before exiting the function. This logic seems straight-forward, but when given
the opportunity, I almost always split the condition into separate
`if-statements`. Another side-effect of having one statement handle two
conditions is the error messaging is a little misleading. _Max indentation is
3_.

```js
function register(email: string, pass: string): Response {
  if (!isEmailValid(email)) {
    return {
      type: 'error',
      payload: 'email is invalid',
    };
  }

  if (!isEmailAvailable(email)) {
    return {
      type: 'error',
      payload: 'email is already taken',
    };
  }

  if (!isPassValid(pass)) {
    return {
      type: 'error',
      payload: 'password must be 8 characters long',
    };
  }

  const userId = createUser(email, pass);
  return {
    type: 'success',
    payload: { userId },
  };
}
```

Using all of the rules we have the final result. This seems readable, traceable
error messaging, and reduces the level of indentation. Now it may seem like this
is lengthier than the other examples, which is true. Lines of code is not really
a concern to me and is not something I consider a valuable metric to compare
code for readability. _Max indentation is 3_.

Could we improve this code even more? Let's try to refactor some of the error
handling by making the validation function return the error message.

## Dynamic returns

```js
/*
  We switch the validation functions from returning if the email is valid to
  returning the error message if the email is not valid. e.g.:
    isValidEmail(string): boolean -> validateEmail(string): string
*/
function register(email: string, pass: string): Response {
  const validations = [
    validateEmail(email),
    validateEmailAvailable(email),
    validatePass(pass),
  ];

  for (let i = 0; i < validations.length; i++) {
    const err = validations[i];
    if (err) {
      return {
        type: 'error',
        payload: err,
      };
    }
  }

  const userId = createUser(email, pass);
  return {
    type: 'success',
    payload: { userId },
  };
}
```

Is this example more readable than the previous one? There are definitely some
positives to this version. It's easier to add more validations because we can
add the functions to the `validations` array and it should just work. There are
only two return statements in the function which is less than the previous
example. However, we have introduced a `for-loop` to iterate over the validation
functions and we will return if any of those validations fail. Even though this
function abstracted the concept of validation and is more scalable to adding
more validations, it strikes me as very dynamic. Also, every function must
subscribe to handling validations the same way, if they don't, figuring out the
bug is going to be tricky to figure out because the error is going happen inside
a `for-loop`. To me, this function is less readable because of its dynamic
nature. The end-developer now needs to mentally iterate over the `validations`
array which is a significant amount of cognitive load. At this point it really
depends on what is more important: readability or scalability. My gut would be
to use the previous example until it is unbearable to continue to write the
validation checks one after another.

## Reduce levels of nesting

As code structure determines its function, the graphic design of code determines
its maintainability. Indentation, while necessary for visualizing the flow
control a program, is often assumed to be merely an aethestic appeal. However,
what if indentation can help determine unnecessary code complexity? Abrupt code
indentation tends to convolute control flow with minor details.
[1](http://www.perforce.com/resources/white-papers/seven-pillars-pretty-code)
Linus Torvalds thinks that greater than three levels of indentation is a code
smell which is part of a greater design flaw.

> Now, some people will claim that having 8-character indentations makes the
> code move too far to the right, and makes it hard to read on a 80-character
> terminal screen. The answer to that is that if you need more than 3 levels of
> indentation, you're screwed anyway, and should fix your program.
> [2](https://www.kernel.org/doc/Documentation/CodingStyle)

In python, indentation is a rule not a guideline, any python script with
misaligned code nesting will result in an
`IndentationError: expected an indented block`. Again in python if you
`import this` you'll get "The Zen of Python," otherwise known as
[PEP20](https://www.python.org/dev/peps/pep-0020/), here is snippet from it:

> **Flat is better than nested.**

Studies by Noam Chomsky suggest that few people can understand more than three
levels of nested ifs
[3](http://www.amazon.com/Managing-structured-techniques-Strategies-development/dp/0917072561),
and many researchers recommend avoiding nesting to more than four levels
[4](http://www.amazon.com/Software-Reliability-Principles-Glenford-Myers/dp/0471627658)
[5](http://www.amazon.com/Software-Engineering-Concepts-Professional-Vol/dp/0201122316%3FSubscriptionId%3D0JRA4J6WAV0RTAZVS6R2%26tag%3Dworldcat-20%26linkCode%3Dxm2%26camp%3D2025%26creative%3D165953%26creativeASIN%3D0201122316)

Jeff Atwood thinks that nesting code has a high
[cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
value which is a measure of how many distinct paths there are through code. A
lower cyclomatic complexity value correlates with more readable code, and also
indicates how well it can be properly tested.
[6](http://blog.codinghorror.com/flattening-arrow-code/)

Why is this important? Rarely does readability seem to play an important role in
most undergraduate discussions when it can in fact be one of the most important
characteristics of widely used and maintainable code. Code that is only
understood by one person is code not worth maintaining -- and as a result poorly
designed.
