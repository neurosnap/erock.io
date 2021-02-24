---
title: What is a selector?
date: '2021-02-24T00:00:00.000Z'
description: A quick introduction to using selectors in a redux application
---

If `redux` is our front-end database, selectors are reusable functions that let
us query our database. There are some rules that are required for selectors to
be useful:

- Pure functions (deterministic: given the same inputs they will always return
  the same outputs)
- Function signature: (state: State, props?: { [key: string]: any }) => any

Selectors ought to keep to the function signature above. We should also try to
avoid using any and instead type exactly when the function requires and returns.

```ts
const selectControlsByLineage = (
  state: State,
  props: { lineage: string },
): Control[] => {};
```

## What is reselect?

`reselect` is a third-party library that helps us build composable selectors as
well as dramatically improve the performance of our queries with memoization.
Memoization is a technique to cache the result of a function. Since selectors
must be pure functions, if the inputs are the same, then the output must also be
the same from the previous computation. This is one of the main mechanisms we
use to improve performance of our application. We use selectors on every single
page within our front-end application and some of the queries we make to our
database can be complex. Determining the time complexity of a selector is a
crucial part of improving the performance of our application. By leveraging
reselect, we sacrifice memory for CPU cycles.

I ask everyone reading this to please spend 10 minutes reading the reselect
docs. They do a great job explaining the API with plenty of examples on how to
use it.

## When should I use reselect?

When to use reselect is very context dependent. Since these are reusable
queries, they have the opportunity to save other developers a lot of time
building their own selectors. When it comes to using reselect for performance
reasons, it’s always recommended to analyze the performance of a query before
and after using reselect. Having said that, I use a very simple heuristic for
when to use reselect:

> If the time complexity for the query is equal to or worse than linear time
> O(n) then we should probably build the selector using createSelector.

### Setup

```ts
interface ToDo {
  id: string;
  text: string;
  completed: boolean;
}

interface State {
  todos: { [key: string]: ToDo };
}

const state: State = {
  todos: {
    1: { id: 1, text: 'learn what a selector is', completed: true },
    2: { id: 2, text: 'learn what reselect is', completed: true },
    3: { id: 3, text: 'learn when I should use reselect', completed: false },
    4: { id: 4, text: 'learn how to write selectors', completed: false },
  },
};
```

### Example 1

```ts
const selectTodos = (state: State) => state.todos;
```

Should we use reselect for selectTodos? To answer this question we need to
understand the time complexity of this function. Accessing a property on an
object is O(1) which is faster than linear time. Therefore, we do not need to
use reselect.

### Example 2

```ts
const selectTodoById = (state: State, props: { id: string }) => {
  const todos = selectTodos(state);
  return todos[id];
};
```

Should we use reselect for `selectTodoById`? A hash lookup is O(1), so no we
should not use reselect in this case.

### Example 3

```ts
const selectCompletedTodos = (state: State) => {
  const todos = selectTodos(state);
  return Object.values(todos).filter((todo) => todo.completed);
};
```

Should we use reselect for `selectCompletedTodos`?
[Object.values for v8 appears to be O(n)](https://stackoverflow.com/questions/7716812/object-keys-complexity/7716858#7716858)
and the filter operation on the lists of todos is also O(n). This operation
should be memoized since it requires linear time to complete.

How would we convert the above function to use `createSelector`?

```ts
import { createSelector } from 'reselect';

const selectTodosAsList = createSelector((todos) => Object.values(todos));
const selectCompletedTodos = createSelector(
  selectTodosAsList, // selector composition is critical!
  (todoList) => todoList.filter((todo) => todo.completed),
);
```

## createSelector limitation

It’s important to note that createSelector will only cache the last result. So
if the inputs keep changing then it will constantly recompute the query.

### Example

```ts
import { createSelector } from 'reselect';

const selectTodosByText = createSelector(
  selectTodos,
  (state: State, props: { search: string }) => props.search,
  (todos, search) => todos.filter((todo) => todo.text.includes(search)),
);

selectTodosByText(state, { search: 'what' });
// returns a cached result!
selectTodosByText(state, { search: 'what' });

// recomputes because the input changed
selectTodosByText(state, { search: 'when' });
// recomputes beacuse the input changed again!
selectTodosByText(state, { search: 'what' });
```

It does not matter if at one point in time we called the selector with the same
props, if the last function execution does not match the same inputs as the
current function execution then it will recompute the query.

## When should I build a selector creator?

A selector creator is a function that creates selectors. This allows us to get
around the last result cache limitation of createSelector that was described
previously. A selector creator is particularly useful when we use the same
selector in multiple places on the same page.

### Example

```ts
import React from 'react';
import { useSelector } from 'react-redux';

const Page = () => {
  const whenTodos = useSelector((state: State) =>
    selectTodosByText(state, { search: 'when' }),
  );
  const whereTodos = useSelector((state: State) =>
    selectTodosByText(state, { search: 'where' }),
  );

  return (
    <div>
      <div>
        {whenTodos.map((todo) => (
          <div key={todo.id}>{todo.text}</div>
        ))}
      </div>
      <div>
        {whereTodos.map((todo) => (
          <div key={todo.id}>{todo.text}</div>
        ))}
      </div>
    </div>
  );
};
```

In this case, `createSelector` is rendered useless because we are constantly
changing the inputs being supplied to our selector `selectTodosByText`.

However, if we build a function that creates selectors for us, then we can build
as many createSelector for our one query as many times as we want.

```ts
const createSelectorTodosByText = () =>
  createSelector(
    selectTodos,
    (state: State, props: { search: string }) => props.search,
    (todos, search) => todos.filter((todo) => todo.text.includes(search)),
  );

import React from 'react';
import { useSelector } from 'react-redux';

// do NOT create these variables inside the react component without
// `useCallback` or `useMemo` because everytime these are called they
// create a new selector with a blank cache.
// It's safer to come up with a way to define these outside the
// react component.
const selectWhenTodos = createSelectorTodosByText();
const selectWhereTodos = createSelectorTodosByText();

const Page = () => {
  const whenTodos = useSelector((state: State) =>
    selectWhenTodos(state, { search: 'when' }),
  );
  const whereTodos = useSelector((state: State) =>
    selectWhereTodos(state, { search: 'where' }),
  );

  // rendering both todos on the page
};
```

This is great because now we have two separate memoized selectors that we can
use in this react component without popping their cache.

## Avoid calling `createSelector` inside a react component

Calling `createSelector` within a react component creates a new memoized
selector on every single run of the component. This defeats the purpose of using
reselect.

### Example

```ts
const makeSelectTodosById = (id: string) => {
  return createSelector(selectTodos, (todos) => todos[id]);
};

const ToDoPage = (props: { id: string }) => {
  // this **creates** a new memoized selector everytime the react component
  // re-renders, which wipes the cache for the selector!
  const todo = useSelector(makeSelectTodosById(props.id));
};
```

Selector builders are not a good way to pass props into the selector.

### Passing props to a selector

If we want to pass props into a selector, build a selector like this:

```ts
const selectPropId = (state: State, { id }: { id: string }) => id;
const selectTodoById = createSelector(
  selectTodos,
  selectPropId,
  (todos, id) => todos[id],
);

const ToDoPage = (props: { id: string }) => {
  const todo = useSelector((state: State) =>
    selectTodoById(state, { id: prop.id }),
  );
};
```

## When to use createSelector or useMemo

With the rapid adoption of react hooks and t he introduction of `useMemo`, one
might ask:
[do we need createSelector anymore?](https://github.com/reduxjs/reselect/issues/386)
I think this topic warrants its own post but I will briefly discuss my thoughts
on the topic.

Both `createSelector` and `useMemo` cache the result of some computation. With
`createSelector` the function is created once in memory and then used throughout
the entire application. As we have seen, when we need to memoize more than one
call to `createSelector` then we need to create a selector factory. With
`useMemo`, on the other hand, the memoization function is created within the
main component render function. `react` has some magic to make this work
correctly that I won't go into, but feel free to read Dan's
[Why do hooks rely on call order?](https://overreacted.io/why-do-hooks-rely-on-call-order/)

[There's a cost to using `useMemo`](https://overreacted.io/before-you-memo/) and
[recent benchmarks suggest that `useMemo` should be used sparringly](https://medium.com/swlh/should-you-use-usememo-in-react-a-benchmarked-analysis-159faf6609b7).

Because of `react`'s magic in order to get hooks to work with their current API,
there's a cost to using them.

Basically, the decision tree for using `createSelector` vs `useMemo` should look
something like this:

- Is my computation >= O(n)?
  - Does my computation solely rely on state data?
    - Use `createSelector`
  - Does my computation rely on state data and component data?
    - Can I easily use `createSelector` with props?
      - Use `createSelector`
    - Does each component need its own memoized selector?
      - Use a selector factory
  - Is my computation one-off with no clear resuability?
    - Is it a heavy computation O(n) > 1000?
      - Use `useMemo`
  - Does my computation not rely on redux data at all?
    - Is it a havey computation O(n) > 1000?
      - Use `useMemo`

The simplest heuristic I can come up with:

> If you can find a way to use `createSelector` instead of `useMemo` then that
> is preferred.

I plan on writing a follow-up article on this topic that goes deeper into the
performance differences between `createSelector` and `useMemo`.

## How to use selectors inside redux-saga

Using selectors inside a saga is pretty simple. redux-saga provides a helper
function called select which will automatically pass the state to the variable.

```ts
import { select } from 'redux-saga/effects';

const selectToken = (state: State) => state.token;
const selectUserById = (state: State, props: { id: string }) => state.users[id];

function* onLogin() {
  const token = yield select(selectToken);
  const userId = yield select(selectUserbyId, { id });
}
```
