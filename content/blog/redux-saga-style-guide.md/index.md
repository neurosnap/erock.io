---
title: Unofficial redux-saga style-guide
date: '2019-12-25T10:00:00.000Z'
description: Recommended rules for building web apps with redux-saga
---

Redux recently updated their
[style guide](https://redux.js.org/style-guide/style-guide) that attempts to set
some standard practices on how to organize state management using redux. I think
this is an important step to create a platform for further discussions. I found
myself agreeing with most of the recommendations, but there are a few that I
disagree with. I think a primary reason why I disagree with the official
style-guide is because virtually every project I use is built with `redux-saga`.

As a software engineer that builds a lot of front-end apps with other engineers,
it's vitally important that when we build an app we make it readable and
maintainable. Official recommendations are the north star for software engineers
because it is the culmination of years of experience and it sets a baseline for
how to build an app successfully. Any `strong recommendations` from the official
style-guide requires an equally strong reason for going against it.

In this article I will go through the recommendations that I think are
contentious and discuss the pros and cons for each one. I also want to put forth
some addenda when using `redux-saga`.

## Critique

### Put as much logic as possible in reducers

- https://redux.js.org/style-guide/style-guide#put-as-much-logic-as-possible-in-reducers

I built a large app that originally placed a lot of logic inside reducers. This
resulted in spaghetti code that was difficult to maintain. Reducers would listen
to actions that were similar, but because the payloads were slightly different
they couldn't easily be abstracted into the same function. In general, I think
having reducers hold a lot of logic makes that logic easy to test but difficult
to maintain, generalize, and refactor over time.

### Model actions as events not setters

- https://redux.js.org/style-guide/style-guide#model-actions-as-events-not-setters

This one I kind of agree with. In a perfect world, I agree with this
recommendation because it does make the event log easier to read. It will also
make time travel debugging -- something I don't find useful -- easier to perform
because there would theoretically be fewer actions dispatched and they are more
traceable to find what triggered them.

However, in practice, I take a hybrid approach. When actions are being
dispatched from react, use events. When actions are dispatched from sagas
(effects), use setters. This will make an action traceable (find the source of
where the action was called) and reducers being maintainable, composable, and
generic containers of data. This is how I view reducers. Reducers don't hold
logic, they are a database table.

Thinking of reducer slices as database tables provides clarity and consistency
to our state management. This doesn't diminish the utility of `redux` it's just
that there are better layers/tools to manage business logic -- _hint where we
manage side-effects_.

### Allow many reducers to respond to the same action

- https://redux.js.org/style-guide/style-guide#allow-many-reducers-to-respond-to-the-same-action

My hot take is that I think there should be a 1:1 mapping between actions and
reducers. Reducers should own the actions (via `createSlice`) and only under
rare exceptions should a reducer listen to outside actions.

Employing this method `redux` becomes a very thin layer of setters to hold data
and tell `react` when state has changed. To me, the real value of redux is:

- One structured way to update state
- A single source of truth that our UI _reacts_ to
- With `react-redux` synchronizing UI with state is handled automatically
- Reducers are pure functions that are easy to test

I'll agree that putting more logic into reducers makes it easier to test, but
I'll also argue that it makes it more difficult to maintain and understand.

### Avoid dispatching many actions sequentially

- https://redux.js.org/style-guide/style-guide#avoid-dispatching-many-actions-sequentially

I want a list of steps that demonstrate how redux is being updated. What I don't
want to do is grep all the reducers for an action type to see how my state is
being updated. This is especially annoying when employing a modular,
feature-based folder structure. We have replaced a single function that
centralized business logic into a composition of functions that are scattered
throughout the codebase. The logic is broken up which makes the flow of what is
happening harder to understand. What compounds this even worse, with libraries
like `redux-saga`, sagas can also listen for those actions and activate even
more side-effects. Generally speaking, I try to only let sagas listen for events
(react-side), not my setters.

## Redux-saga style-guide

Take the `redux` style-guide, remove the ones listed above, and add these for my
unofficial `redux-saga` style-guide.

### Reducers as setters

Redux is an object that should be thought of like a database. Reducer slices are
database tables. We should reduce boilerplate with slice helpers
[robodux](https://github.com/neurosnap/robodux#slice-helpers) or
[slice-helpers](https://github.com/neurosnap/slice-helpers) by leveraging new
_officially_ sanctioned helpers like `createSlice`.

We don't even need to test our reducers anymore because these libraries already
did that for us.

This makes reducers predictable, isn't that one of the taglines for redux:
`predictable` state container? Reducers are simplified, and slice helpers cover
90% of our use cases, because we are treating them like database tables.

### UI dispatches events, effects dispatch events and setters

When `react` dispatches actions, it should dispatch events, like the `redux`
style-guide recommends.

When effects like sagas dispatch actions, it can dispatch events and setters.
This still provides some traceability and helps centralize business logic into
one layer.

### Effects as central processing unit

Most of my arguments revolve around using effects as the primary location for
business logic. Whenever I build a react/redux app, beyond the simplest app, I
need something more powerful, maintainable than `redux-thunk`. `redux-toolkit`
endorses using `redux-thunk` and only under special circumstances should we
reach for something more powerful like `redux-saga`. Personally, I think this is
misguided. I understand that `redux-thunk` is a simple addition (you could
inline it easily) with only
[14 lines of code](https://github.com/reduxjs/redux-thunk/blob/master/src/index.js)
but that's kind of my point. Redux has always struggled with one of the most
important parts of building a web app: side-effects. To be honest I actually
think this is a positive for `redux` because it manages state, not side-effects.
Use another tool to solve side-effects. Even Dan admits (TODO: find twitter
link) that he was hoping that `redux-thunk` would be replaced by something built
by the community.

To me, there's no real debate: use `redux-saga`. I understand why it cannot be
officially sanctioned: because for simple todo apps -- something the js
community uses as a litmus test to compare implementations -- it is unnecessary.
I get it, but beyond anything simple, you _need_ something more powerful.

Yes, there's a learning curve, the same can be said for `redux` and yet we all
still recommend it. `redux-saga` uses ES6 generators, they are not that
difficult to grok, and are part of the language. If you are an engineer, it is
your responsibility to learn language features.

Testing sagas are one of its greatest assets. It is the main reason I prefer
generators over async/await. Testing generators are so amazing I try to leverage
them with every piece of code I write. Even outside of `redux`, I want
`redux-saga`. This is why I've created
[cofx](https://github.com/neurosnap/cofx).

There is not a good story for testing thunks and if we care about testing code
as professional software engineers then we need to make testing as easy as
possible.

I wrote an entire article on
[testing with generators](https://erock.io/simplify-testing-async-io-javascript/)

### The robodux pattern

This is [ducks](https://github.com/erikras/ducks-modular-redux) on steroids.
[robodux](https://github.com/neurosnap/robodux) is a library I wrote that works
extremely well with `redux-saga` and this style-guide.

The anatomy of a package:

```js
// this package is called `people`.  It manages all the people being added to our
// system.
import { call, put, takeEvery } from 'redux-saga/effects';
import { mapSlice, createReducerMap, createAction } from 'robodux';
import { createSelector } from 'reselect';

// These are global types.  Packages should not export the reducer state types
// to avoid circular dependencies
import { Person, PeopleMap, State, Action } from '@app/types';
// generic effect for fetching from API, wraps window.fetch in this example
import {
  ApiFetchResponse,
  apiFetch,
  apiSuccess,
  ErrorResponse,
} from '@app/fetch';
// generic loader reducer slice `loadingSlice`
import { setLoaderStart, setLoaderError, setLoaderSuccess } from '@app/loader';

// creating an entity with sane defaults is very useful when you want your app
// to always expect some structure.  This helps reduce the need for existential
// checks.  I use them everywhere.
export const defaultPerson = (p: Partial<Person> = {}): Person => {
  const now = new Date().toISOString();
  return {
    id: '',
    name: '',
    email: '',
    createdAt: now,
    updatedAt: now,
    ...p,
  };
};

// Here we are creating a reducer and its corresponding actions
// a mapSlice is a slice helper for create a db table like structure:
// the key is the entity id and the value is the object
const name = 'people';
const people =
  mapSlice <
  PeopleMap >
  {
    name,
  };

// These are the actions for manage the data inside the people reducer.
// add -> add entities to db table
// set -> remove previous entities and add new ones
// remove -> ids to remove from db table
// reset -> reset to `initialState`, usually {}
// patch -> update a property on an entity
export const {
  add: addPeople,
  set: setPeople,
  remove: removePeople,
  reset: resetPeople,
  patch: patchPeople,
} = people.actions;

// helper when there are multiple slices inside a single package -- which is
// allowed and suggested.
export const reducers = createReducerMap(people);

// selectors are always prefixed with `select`.  These should be exported so
// other packages and the UI layer can use them
export const selectPeople = (state: State) => state[name] || {};
export const selectPeopleAsList = createSelector(
  selectPeople,
  (peeps) => Object.values(peeps),
);
export const selectPerson = (state: State, { id }: { id: string }) =>
  selectPeople(state)[id];

interface PersonResponse {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
}

interface PeopleResponse {
  people: PersonResponse[];
}

// another function that extremely helpful.  Transform functions take the API
// response and transforms them into the entities all our code uses.
function transformPerson(p: PersonResponse): Person {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// action to fetch people
export const fetchPeople = createAction < string > 'FETCH_PEOPLE';

// where all of our business logic goes for fetching/storing people
function* onFetchPeople(action: Action<string>) {
  const orgId = action.payload;
  if (!orgId) {
    return;
  }

  yield put(setLoaderStart());
  const resp: ApiFetchResponse<PeopleResponse> = yield call(
    apiFetch,
    `/orgs/${orgId}/people`,
  );

  if (!apiSuccess(resp)) {
    yield put(setLoaderError(resp));
    return;
  }

  const curPeople =
    resp.data.people.map(transformPerson).reduce <
    PeopleMap >
    ((acc, person) => {
      acc[person.id] = person;
      return acc;
    },
    {});

  // use `batchActions` to silence any arguments against sequential dispatches
  yield put(batchActions([addPeople(curPeople), setLoaderSuccess()]));
}

function* watchFetchPeople() {
  yield takeEvery(`${fetchPeople}`, onFetchPeople);
}

// export all sagas so they can be mounted when creating redux store
export const sagas = {
  watchFetchPeople,
};
```

#### Rules

1. _May_ export named `reducers` which is an object where keys are the reducer
   name and the value is the reducer.
2. _May_ export named `sagas` which is an object containing sagas that should be
   mounted when creating store.
3. _May_ export actions to hit reducers or sagas
4. _May_ export selectors for data from reducer or parent data
5. _Must_ prefix selectors with `select`
6. _Must_ prefix getting data from API with `fetch`

The rules revolve around creating a consistent API for interacting with reducers
and sagas.

Want to learn more about this style? Check out my other article on
[scaling a react/redux codebase](https://erock.io/scaling-js-codebase-multiple-platforms/)

## Links

- https://redux.js.org/style-guide/style-guide
- https://redux.js.org/faq/code-structure#how-should-i-split-my-logic-between-reducers-and-action-creators-where-should-my-business-logic-go
- https://blog.isquaredsoftware.com/2017/05/idiomatic-redux-tao-of-redux-part-2/#thick-and-thin-reducers
- https://twitter.com/dan_abramov/status/800310164792414208
- https://github.com/reduxjs/redux-toolkit/issues/91#issuecomment-456827660
- https://github.com/reduxjs/redux-toolkit/issues/17#issuecomment-414543588
