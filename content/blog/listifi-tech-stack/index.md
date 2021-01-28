---
title: Listifi tech stack
date: '2021-01-25T00:00:00.000Z'
description: An overview of the tech choices I made for listifi.app
---

Given I recently launched [listifi](https://listifi.app), I thought it would be
interesting to talk briefly about the [listifi](https://listifi.app) tech stack.

# Tech stack

I'd be remiss if I didn't use my app before discussing my list of stack choices.
[Here is my tech stack](https://listifi.app/u/erock/listifi-tech-stack).

In general, when I build an app I tend to focus on gluing the pieces together
myself. This is my personal preference, but I find that frameworks or libraries
that try to do too much end up getting in my way very quickly.

> Provide some helper utilities and then get out-of-my-way.

The overall folder/file structure follows the patterns I described in my
previous
[blog article](http://localhost:8000/scaling-js-codebase-multiple-platforms/).

## Front-end

There are some common choice in my list, in particular: typescript and react. I
also opted to use a component library [chakra-ui](https://chakra-ui.com)
primarily because it made it easy to make CSS changes by using react component
props. It also wasn't a massive library that tried to solve every design or UX
problem users would come across.

One potentially controversial choices was reaching for `redux`. It seems as of
late `redux` has fallen slightly out-of-favor and more people are migrating
towards react-specific libraries like [recoil](https://recoiljs.org/). I spent
some time researching `recoil` and ultimately decided it did not fit into my
personal design choices. In particular, I don't like how tightly coupled
`recoil` is to `react`. I find this tight coupling makes it an easier API to
work with, but will inevitably lead to issues if I wanted to build a
react-native mobile app or a CLI app. Since `redux` is framework agnostic,
battle-tested, and using libraries like
[robodux](https://github.com/neurosnap/robodux) I can avoid 90% of the
boilerplate.

`robodux` is great because it promotes the idea that `redux` is just a local
database. I can create database tables which translate to `slices` in the
`redux` world.

Building a `redux` slice that has: action types, action creators, and a reducer
with a common set of table operations like: `set`, `add`, `patch`, and `remove`
can be written in a single line of code:

```ts
import { createTable } from `robodux`;

interface List {
  id: string;
  name: string;
  ownerId: string;
}

const slice = createTable<List>({ name: 'LISTS' });
/*
{
  actions: {
    add,
    set,
    remove,
    patch
  },
  reducer,
  getSelectors,
}
*/
```

[redux-cofx](https://github.com/neurosnap/redux-cofx) is another library I wrote
that is a hybrid between `redux-saga` and `redux-thunk`. Instead of wiring
generator functions up to sagas, I simply create a function like `thunks` that
activate a generator function and still leverage the API of `redux-saga`. For
example, if I want to fetch some lists, I would write something like this:

```ts
import { select, call, batch, createEffects } from 'redux-cofx';
import { selectHasTokenExpired } from '@app/token';
import { apiFetch } from '@app/fetch';

// API is very similar to redux-saga
export function* onFetchLists() {
  const hasTokenExpired = yield select(selectHasTokenExpired);
  if (hasTokenExpired) {
    return;
  }

  const resp: ApiFetchResponse<ApiListsResponse> = yield call(
    apiFetch,
    '/lists',
  );

  if (!resp.ok) {
    return;
  }

  const users = processUsers(resp.data.users);
  const lists = processLists(resp.data.lists);
  // this dispatches multiple actions at the same time without
  // two copies of the state being generated
  yield batch([
    addLists(lists),
    addUsers(users)
  ]);
}

// This is a helper function that will
// convert a map of action creator names to effects.
// When we dispatch `fetchLists` it will
// activate `onFetchLists`: e.g. store.dispatch(fetchLists());
export { fetchLists } = createEffects({
  fetchLists: onFetchLists
});
```

It's a very useful little library that is a satisfying hybrid between
`redux-saga` and `redux-thunk` and I encourage anyone who feels like
`redux-saga` is too heavy for their uses to
[give it a try](https://github.com/neurosnap/redux-cofx).

## Backend

On the backend I decided to go with [koa](https://koajs.com/). I found the
minimalist approach of the library to be aesthetically pleasing and exactly what
I want from a web server. Koa doesn't even come bundled with a router, you have
to install one yourself, I love that! `koa` has a great middleware system,
adopted from [express](http://expressjs.com/).

I originally went with [prismajs](https://www.prisma.io/) but ultimately found
the library is too limited and restrictive. I would highly recommend people use
it if they are using `graphql`, but for a simple RESTful API, I found it
couldn't do even the simplest of SQL queries.

So, in the end, I switched to [knexjs](http://knexjs.org/) which, again, plays
right into my preferences. It's a query builder. When I think about how to query
my data, I really just want to write SQL.

_As an aside, I really do not get the fascination with ORMs. SQL is already a
DSL, why are we re-inventing the wheel and adding another layer of abstraction?
SQL is amazing and more people should be comfortable writing in it._

I ended up writing my own server-side rendering implementation for `react`. All
in, with data loading and getting data loaded into `redux` I wrote about 300
lines of code. Once I landed on a working implementation, the rest was pretty
straight-forward. However, I get why people don't want to keep rebuilding SSR
over and over again and end up switching to something like
[nextjs](https://nextjs.org).

## Deployment

For deployment I tend to lean heavily on docker. I use
[docker-compose](https://docs.docker.com/compose/) for development and
[docker-machine](https://docs.docker.com/machine/) for deployment. Since this
was a fresh project that I don't know how far I'm going to take it, I didn't
want to create an automated build pipeline using CI. I'll briefly describe my
deployment lifecycle:

- Develop using `docker-compose` locally
- Build features locally
- Use a production tuned `docker-compose` yml file to build images locally
- Push the images to Google’s Container Registry
- Then I run `eval $(docker-machine <name> env)` to tunnel into my production
  VM’s docker
- Then I run `docker-compose -f production.yml pull --ignore-pull-failures` to
  download the new images
- Then I run `docker-compose -f production.yml up --no-deps -d` to restart my
  containers with the new images

My VM was on [Google's Cloud Compute](https://compute.google.com) and my domain
was hosted on [Cloudflare](https://cloudflare.com).

## Conclusion

This covers a high-level overview of my tech stack and something I will continue
to reach for on new projects. It fits nicely into my development style and I
understand how all the pieces work together because I wrote the glue myself.
