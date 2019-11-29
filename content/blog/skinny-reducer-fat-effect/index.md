---
title: Fat effect, skinny reducer
date: '2019-12-25T10:00:00.000Z'
description: The delicate dance between reducers and side-effects
---

## Under fire

Redux recently released a style guide that attempts to set some standard
practices on how to organize state management using redux. I think this is an
important step to create a platform for further discussions. I found myself
agreeing with most of the recommendations, but there are a few that I disagree
with. As a software engineer leading a team of front-end engineers, it's vitally
important that I scaffold and app that is readable and maintainable. Official
recommendations are the north star for software engineers because it is the
culmination of years of experience and it sets a baseline for how to build an
app successfully. Any `strong recommendedations` from the official style-guide
necessitates an equally strong reason for going against it.

In this article I will go through the recommendations that I think are
contentious and discuss the pros and cons for each one and try to provide
alternatives that scale.

## Put as much logic as possible in reducers

I built a large app that originally placed a lot of logic inside reducers. This
resulted in spaghetti code that was difficult to maintain. Reducers would listen
to actions that were similar, but because the payloads were slightly different
they couldn't be abstracted into the same function. In general, I think having
reducers hold a lot of logic makes that logic easy to test but difficult to
maintain and refactor over time.

- https://redux.js.org/style-guide/style-guide#put-as-much-logic-as-possible-in-reducers

## Model actions as events not setters

This one I kind of agree with. In a perfect world, I agree with this
recommendation because it does make the event log easier to read. It will also
make time travel debugging easier to perform because there would theoretically
be fewer actions dispatched.

However, in practice, I take a hybrid approach. When actions are being
dispatched from react, use events. When actions are being dispatched from sagas
(effects), use setters. this is my compromise between an action log be tracable
(find the events) and my reducers being maintainablem, composable, and generic
containers of different data structures.

- https://redux.js.org/style-guide/style-guide#model-actions-as-events-not-setters

## Allow many reducers to respond to the same action

My hot take is that I think there should be a 1:1 mapping between actions and
reducers. Reducers should own the actions (via `createSlice`) and only under
rare exceptions should a reducer listen to outside actions.

Employing this method, redux becomes a very thin layer of setters to hold data
and tell react when state has changed. To me, the real innovation with redux is
via `react-redux`. To me, the biggest reasons to use redux are:

- One consistent way to update state
- Global state object that react components have full access to
- With `react-redux` synchronizing UI with state is handle automatically
- Reducers are easy to test

I'll agree that putting more logic into reducers makes it easier to test, but
I'll again argue that it makes it more difficult to maintain.

- https://redux.js.org/style-guide/style-guide#allow-many-reducers-to-respond-to-the-same-action

## Avoid dispatching many actions sequentially

I want a list of steps that demonstrate how redux is being updated. What I don't
want to do is grep all the reducers for an action type to see how my state is
being updated. This is especially annoying when employing a modular,
feature-based folder structure. We have replaced a single function that
centralized business logic into a composition of functions that are scattered
throughout the codebase. The logic is broken up and any reducer can respond to
an action. What compounds this even worse, with libraries like `redux-saga`,
sagas can also listen for those actions and activate even more side-effects.

- https://redux.js.org/style-guide/style-guide#avoid-dispatching-many-actions-sequentially

## Reducers as setters

## Effects as central processesing unit

Most of my arguments revolve around using effects as the primary location for
business logic. Whenever I build a react/redux app, beyond the simplest app, I
need something more powerful, maintainable than `redux-thunk`. `redux-toolkit`
endorses using `redux-thunk` and only under rare circumstances should we reach
for something more powerful like `redux-saga`. Personally, I think this is
misguided. I understand that `redux-thunk` is only
[14 lines of code](https://github.com/reduxjs/redux-thunk/blob/master/src/index.js)
but that's kind of my point. Redux has always struggled with one of the most
important parts of building a web app: side-effects. It tried to ignore it for
the longest time. Even Dan admits (TODO: find twitter link) that he was hoping
that `redux-thunk` was intended to be replaced by something build from the
community.

To me, there's no real debate: use `redux-saga`. I understand why it cannot be
officially sanctioned: because for simple todo apps -- something the js
community uses as a litmus test to compare implementations -- it is unnecessary.
I get that, but beyond anything simple, `redux-saga` should be a requirement.

I'd feel remise if I didn't plug one of my own libraries that I've attempted to
address some of the complexity with `redux-saga` by building a hybrid between
`redux-saga` and `redux-thunk` called
[redux-cofx](https://github.com/neurosnap/redux-cofx).

## Links

- https://redux.js.org/style-guide/style-guide
- https://redux.js.org/faq/code-structure#how-should-i-split-my-logic-between-reducers-and-action-creators-where-should-my-business-logic-go
- https://blog.isquaredsoftware.com/2017/05/idiomatic-redux-tao-of-redux-part-2/#thick-and-thin-reducers
- https://twitter.com/dan_abramov/status/800310164792414208
- https://github.com/reduxjs/redux-toolkit/issues/91#issuecomment-456827660
- https://github.com/reduxjs/redux-toolkit/issues/17#issuecomment-414543588
