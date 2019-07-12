---
title: 3 Rules for Refactoring Functions
date: '2019-07-11T10:00:00.000Z'
description: Simple steps to guarantee cleaner functions
---

1. Return early
2. Return often
3. Reduce levels of nesting

Like most things in life, these are rules with exceptions. The first
implementation should employ these rules when developing a function but there
are certainly cases where they might betray you. Having said that, if you stick
to these rules _most of the time_ your code will become easier to read and
maintain.

## Return early

The general idea is to figure out all the ways to exit a function as quickly as
possible. This reduces cognitive overhead when reading a function. When trying
to trace a bug through a system and coming across a function that returns early
for your use-case there's a sensation of relief: "Whew! Another function I don't
have to worry about." The following example is trivial but it explains the point
I want to make so try to imagine much more complicated logic when reading these
examples.

```js
interface Data {
  message: string;
  date: ?Date;
}

function printMessage(data: ?Data): string {
  if (data) {
    if (data.date) {
      const date = formatDate(data.date);
      return `${date}: ${data.message}`;
    }
  }

  return message;
}
```

In the above example we are checking to see if a nested value exists and if it
does we do the meat of the functionality there. For this example it seems
innocuous, but the meat of this function is buried in conditional logic that
makes it harder to read and understand. Max indendation is 3.

```js
function printMessage(data: ?Data): string {
  if (!date || (data && !data.date)) {
    return message;
  }

  const date = formatDate(data.date);
  return `${date}: ${data.message}`;
}
```

Here we check to see if the value doesn't exist and then returns early. Now
instead of the main meat of the functionality being nested in multiple if
statements it's in the main body of the function. Why is this a good thing? We
are figuring out all the ways to **not** run the main contents of this function
first and then we worry about doing the actual thing. To me this is more
readable and easier to understand. Max indentation is 2.

## Return often

Don't wait until the end of a function to return. Based on experience, waiting
until the end to return from a function ends up creating a lot of branching
logic that a developer has to keep track of in their head when traversing a
function's code. This rule will prove to be most contentious because returning
often does have its drawbacks. It makes inspecting the function harder
especially if you are a developer who heavily relies on log statements for
debugging.

```js
function printMessage(data: ?Data): string {
  if (!date) {
    return message;
  }

  if (!date.data) {
    return message;
  }

  const date = formatDate(data.date);
  return `${date}: ${data.message}`;
}
```

As you can see, we have removed some unnecessary logic by creating two early
returns. Instead of an if statement that has an **OR** and **AND**, we have two
separate negation checks. Max indentation is still 2 and it's easier to read.
The drawback to this approach is if you print the results of the function, you
don't know where in the function the result exited because it could be from a
few places.

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

## Conclusion

These are three rules I think about when writing every single function and I
firmly believe it has resulted in easier to read code.
