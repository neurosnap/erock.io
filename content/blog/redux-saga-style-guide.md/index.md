---
title: Redux-saga style-guide
date: '2020-01-01T00:00:00.000Z'
description: Recommended rules for building web apps with redux-saga
---

Redux recently updated their
[style guide](https://redux.js.org/style-guide/style-guide) that attempts to set
some standard practices on how to organize state management using redux. I think
this is an important step to create a platform for further discussions. I found
myself agreeing with most of the recommendations, but there are a few that I
disagree with. I think the primary reason why I disagree with the style-guide is
because virtually every project I use is built with `redux-saga` and the `redux`
maintainers overall do not consider `redux-saga` a good choice so make no
recommendations for it. From my perspective, `redux-thunk` is rarely the right
choice except for very small react applications which I think is where most of
the divide is coming from. Neither thoughts about how to build a `redux` app are
wrong, these are diverging opinions because of the different libraries we are
using.

As a software engineer that builds a lot of front-end apps with other engineers,
it's vitally important that _when_ we build an app, we make it readable and
maintainable. Official recommendations are the north star for software engineers
because it is the culmination of years of experience and it sets a baseline for
how to build an app successfully. Any `strong recommendations` from the official
style-guide requires an equally strong reason for going against it.

In this article I will go through the recommendations that I think are
contentious and I want to put forth some recommendations when using
`redux-saga`.

## Critique

### Put as much logic as possible in reducers

- https://redux.js.org/style-guide/style-guide#put-as-much-logic-as-possible-in-reducers

I built a large app that originally placed a lot of logic inside reducers. This
resulted in spaghetti code that was difficult to maintain:

- In order to understand what an action is doing, the developer needs to grep
  for all occurrences of the action type and then piece together the logic.
- Reducers would listen to actions that were similar, but because the payloads
  were slightly different they couldn't easily be abstracted into the same
  functionality, causing duplicated code.
- I have regularly run into situations where a reducer needed access to other
  slice data that is not easily available inside of a reducer slice.

In general, I think having reducers hold a lot of logic makes that logic easy to
test but difficult to maintain, generalize, and refactor over time.

### Model actions as events not setters

- https://redux.js.org/style-guide/style-guide#model-actions-as-events-not-setters

Theoretically I agree with this one because it does make the event log easier to
read. It will also make time travel debugging -- something I don't find useful
-- easier to perform because there would be fewer actions dispatched and they
are more traceable to find what triggered them.

However, in practice, I take a hybrid approach. When actions are being
dispatched from react, use events. When actions are dispatched from sagas
(effects), use setters. This will make an action traceable (find the source of
where the action was called) and reducers become generic containers of data that
are maintainable, composable. This is how I view reducers: they don't hold
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

Employing this method, `redux` becomes a very thin layer of setters to hold data
and tell `react` when state has changed. I know this point of view is
[controversial](https://twitter.com/dan_abramov/status/800310164792414208) and
normally when it comes to building apps as part of a team I don't like to go
against the standards, but this really is being driven by my experience building
large scale web applications with a team of engineers.

To me, the real value of redux is:

- A single global state object that is easily accessible through entire codebase
- One structured way to update state
- A single source of truth that our UI _reacts_ to
- With `react-redux` synchronizing UI with state is handled automatically

### Avoid dispatching many actions sequentially

- https://redux.js.org/style-guide/style-guide#avoid-dispatching-many-actions-sequentially

I want a list of steps that demonstrate how redux is being updated ideally in
the same function. What I don't want is to grep all the reducers for an action
type to see how my state is being updated. This is especially annoying when
employing a modular, feature-based folder structure. We have replaced a single
function that centralizes business logic into a composition of functions that
are scattered throughout the codebase. The logic is broken up which makes the
flow of what is happening harder to understand. What compounds this even worse,
with libraries like `redux-saga`, sagas can also listen for those actions and
activate even more side-effects.

_Aside: I try to only let sagas listen for events (react-side), not my setters
to avoid errant infinite loops._

The counter-argument regularly cited is that sequential dispatches could trigger
multiple react re-renders. This is because each action sequentially hits the
root reducer and could return a new version of the state, triggering an update
event. `redux` could have allowed for an array of actions to be dispatched, but
that was ultimately [rejected](https://github.com/reduxjs/redux/pull/1813).
Because of this, developers are now required to use
[redux-batched-actions](https://github.com/tshelburne/redux-batched-actions). I
think it should have been part of the API and if I were rebuilding `redux` from
scratch, it would be an included feature, but I also agree with their
perspective: it could make a lot of people unhappy and there's a user-land
library that makes it work all the same. Regardless, this suggestion and
argument revolving around performance is really because the redux API does not
support dispatching an array of actions. If I could add one thing to the redux
API it would probably be that.

## Saga style-guide

Take the `redux` style-guide, remove the ones listed above, and add these for my
unofficial `redux-saga` style-guide.

### Effects as the central processing unit

Most of my arguments revolve around using effects as the primary location for
business logic. Whenever I build a react/redux app, beyond the simplest of them,
I need something more powerful and maintainable than `redux-thunk`.
`redux-toolkit` endorses using `redux-thunk` and only under special
circumstances should we reach for something more powerful like `redux-saga`.
Personally, I think this should be the opposite. I understand that `redux-thunk`
is a simple addition (you could inline it easily) with only
[14 lines of code](https://github.com/reduxjs/redux-thunk/blob/master/src/index.js)
but that's kind of my point. Redux has always struggled with one of the most
important parts of building a web app: side-effects. To be honest I actually
think this is a positive for `redux` because it manages state, not side-effects.
Use another tool to solve side-effects. Even Dan
[admits](https://twitter.com/dan_abramov/status/800105879290912768) that he was
hoping that `redux-thunk` would be replaced by something built by the community.

To me, there's no real debate: use `redux-saga`. I understand why it cannot be
officially sanctioned: because for simple todo apps -- something the js
community uses as a litmus test to compare implementations -- it is unnecessary.
I get it, but beyond anything simple, you _need_ something more powerful.

Yes, there's a learning curve, the same can be said for `redux` and yet we all
still recommend it. `redux-saga` uses ES6 generators, they are not that
difficult to grok, and are part of the language. If you are an engineer, it is
your responsibility to learn all language features.

Testing sagas are one of its greatest assets. It is the main reason I prefer
generators over async/await. Testing generators are so amazing I try to leverage
them with every piece of code I write. Even outside of `redux`, I want
`redux-saga`. This is why I've created
[cofx](https://github.com/neurosnap/cofx).

There is not a good story for testing thunks and if we care about testing code
as professional software engineers then we need to make testing as easy as
possible.

Interested to learn more? I wrote a separate article on
[testing with generators](https://erock.io/simplify-testing-async-io-javascript/)

### Reducers as setters

Redux is an object that should be thought of like a database. Reducer slices are
database tables. We should reduce boilerplate with slice helpers
([robodux](https://github.com/neurosnap/robodux#slice-helpers) or
[slice-helpers](https://github.com/neurosnap/slice-helpers)) by leveraging new
_officially_ sanctioned helpers like `createSlice`.

We don't even need to test our reducers anymore because these libraries already
did that for us.

This makes reducers predictable, isn't that one of the taglines for redux? A
`predictable` state container? Reducers are simplified, and slice helpers cover
90% of our use cases, because we are treating them like database tables.

### UI dispatches events, effects dispatch events and setters

When `react` dispatches actions, it should dispatch events, like the `redux`
style-guide recommends.

When effects like sagas dispatch actions, it can dispatch events and setters.
This still provides some traceability and helps centralize business logic into
one layer.

### Build indexes for your db tables

Need to have a sorted list of entities that come from an API? Need to group a
subset of entities? First try to create a selector for it. If we need to
preserve the order the API sent us then we can create a reducer `EntityId[]`
that acts like an index.

Yes, it feels like we are rebuilding a database, but it's not that much work and
the manual process allows for performance tweaking which is desirable when
building a large application. You will also have to maintain both reducers
together. This might sound tedious or prone to errors but in reality these two
reducers are coupled by our effects, so it's not that difficult.

```ts
import { call, put } from 'redux-saga/effects';
import { mapSlice, assignSlice } from 'robodux';
import { batchActions } from 'redux-batched-actions';

interface Article = {
  title: string;
  post: string;
  author: string;
}

interface ArticleMap {
  [key: string]: Article;
}

// hashmap to store all articles for easy id lookup
const articles = mapSlice<ArticleMap>({ name: 'articles' });
const { set: setArticles } = articles.actions;
// sorted array of article ids that we receive from the API
const articleOrder = assignSlice<string[]>({ name: 'articleOrder' });
const { set: setArticleOrder } = articleOrder.actions;

function* onFetchArticles() {
  const response = yield call(fetch, '/articles');
  const articles: Article[] = yield call([response, 'json']);
  // preserve order from API
  const articleOrder = articles.map((article) => article.id);
  // build hashmap of articles (normalize) for easier lookup and update
  const articleMap = articles.reduce<ArticleMap>((acc, article) => {
    acc[article.id] = article;
    return acc;
  }, {});

  yield put(
    batchActions([setArticles(articleMap), setArticleOrder(articleOrder)]),
  );
}
```

### The robodux pattern

This is [ducks](https://github.com/erikras/ducks-modular-redux) on steroids.
[robodux](https://github.com/neurosnap/robodux) is a library I wrote that works
extremely well with `redux-saga` and this style-guide.

The anatomy of a package:

```ts
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
// checks.  I use them everywhere.  These are also very useful for writing
// tests that care about type safety.
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
const people = mapSlice<PeopleMap>({ name });

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
export const fetchPeople = createAction<string>('FETCH_PEOPLE');

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

  const curPeople = resp.data.people
    .map(transformPerson)
    .reduce<PeopleMap>((acc, person) => {
      acc[person.id] = person;
      return acc;
    }, {});

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

1. _May_ contain multiple slices
2. _May_ export named `reducers` which is an object where keys are the reducer
   name and the value is the reducer.
3. _May_ export named `sagas` which is an object containing sagas that should be
   mounted when creating store.
4. _May_ export actions to hit reducers or sagas
5. _May_ export selectors for data from reducer or parent data
6. _Must_ prefix selectors with `select`
7. _Must_ prefix getting data from API with `fetch`

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
