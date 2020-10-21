---
title: Recreating redux-toolkit's createSlice
date: '2020-10-07T00:00:00.000Z'
description: Learn how to use createSlice by implementing it yourself
---

## What is a slice?

In redux, a slice is a "slice" of your redux state object.

```ts
store.getState();
/*
{
  token: '', // this is a slice
  users: {}, // this is a slice
  todos: {}, // this is a slice
}
*/
```

## Actions and reducers per slice

[Splitting up reducer logic](https://redux.js.org/recipes/structuring-reducers/splitting-reducer-logic)
is an import concept in redux where we compose multiple reducers into one big
reducer using [combineReducers](https://redux.js.org/api/combinereducers). For
every slice, there is a single corresponding reducer. When building store data
inside redux, it is very common to build a set of actions and a reducer that
responds to those actions.

## What is `createSlice`?

`createSlice` is a higher-order function that accepts the slice name (e.g.
`token`, `user`, `todos`), a set of reducers, and returns a single reducer along
with the action creators for that reducer. The goal of `createSlice` is to
reduce the boilerplate required to add data to redux the canonical way.

The [createSlice](https://redux-toolkit.js.org/api/createSlice) we know of today
from `redux-toolkit` was inspired by
[autodux](https://github.com/ericelliott/autodux).
[I also helped build the original implementation in redux-toolkit](https://github.com/reduxjs/redux-toolkit/issues/17#issuecomment-414543588)
and have been using it for every redux project since. It is a powerful helper
function that has gained a ton of popularity in the redux community.

However, it is common for engineers learning redux for the first time to be
completely overwhelmed by the terms and phrases used by the redux community.
This is exacerbated by the fact that every reducer is now wrapped by
`createSlice`.

In this post, I want to demystify `createSlice` by building our own stripped
down version of it for new engineers to use as a reference guide when learning
redux.

## BYO `createSlice`

In order to build our own `createSlice` we need to build a couple of other
helper functions first.

Note: all of these implementations are simplified versions of the official ones
to be used as a learning guide. If you dig into the `redux-toolkit` source code,
you'll see that most of the code are typings and embellishments on top of the
code written in this article.

For our example usage we will be recreating redux's
[example todo list](https://redux.js.org/basics/example#example-todo-list)

```ts
type ToDo {
  id: string;
  text: string;
  completed: boolean;
}
```

### BYO `createAction`

`createAction` is a simple helper function that accepts a string and returns an
action creator.

```ts
function createAction<P = any>(type: string) {
  const actionCreator = (payload?: P) => {
    return {
      type,
      payload,
    };
  };

  // this overrides the default stringification method so when we stringify the
  // action creator we get the action type
  actionCreator.toString = () => `${type}`;
  return actionCreator;
}
```

#### Example usage for `createAction`

```ts
const addTodo = createAction<ToDo>('ADD_TODO');
addTodo({ id: '1', text: 'build my own createAction', completed: true });
/*
{
  type: 'ADD_TODO',
  payload: { id: '1', text: 'build my own createAction', completed: true },
}
*/
```

### BYO `createReducer`

`createReducer` is a function that accepts an object where the keys are the
action type and the values are the reducer.

The `redux-toolkit` version of `createReducer` leverages
[immer](https://github.com/immerjs/immer) to handle state updates. I won't go
into the details of how `immer` works but just know that it is a clever way for
the end-developer to appear to mutate their state object while under-the-hood
`immer` actually handles updates to the state in an immutable, redux-friendly
manner.

For the purposes of our demonstration, we will _not_ be using `immer`.

```js
// for the purposes of this demonstration I'm removing types because otherwise
// it would dramatically increase the complexity of this code.
function createReducer(initialState, reducers) {
  /*
    This is a reducer function that selects one of the other reducer functions
    based on the action  type (key).  When we call this reducer, we do a lookup
    on our `reducers` object by the key which, in this case, is the `action.type`.
    If there's a match we call that reducer function with the `action.payload`.

    If our `reducers` object was { increment: (state, payload) => state += 1 }
    and the reducer function received: state = 0, action = { type: 'increment' }
    we match the action type with the reducers key 'increment',call that reducer function,
    and the new state value would be `1`.
  */
  const reducer = (state = initialState, action) => {
    const caseReducer = reducers[action.type];
    if (!caseReducer) {
      return state;
    }
    // note that I am not passing the entire action object to each reducer,
    // simply the payload
    return caseReducer(state, action.payload);
  };

  return reducer;
}
```

#### Example usage for `createReducer`

```ts
import { createStore } from 'redux';

type State = ToDo[];
const addTodo = createAction<ToDo>('ADD_TODO');
const toggleTodo = createAction<string>('TOGGLE_TODO');
const reducer = createReducer([], {
  addTodo: (state: State, payload: ToDo) => {
    return [...state, action.payload];
  },
  toggleTodo: (state, payload: string) => {
    return state.map((todo) => {
      // when we find the todo id that matches the payload we toggle the completed state
      if (todo.id === payload) {
        return { ...todo, completed: !todo.completed };
      }
      return todo;
    });
  },
});

const store = createStore(reducer, []);
store.dispatch(addTodo({ id: '1', text: 'byo createAction', completed: true }));
store.dispatch(
  addTodo({ id: '2', text: 'byo createReducer', completed: false }),
);
store.dispatch(addTodo({ id: '3', text: 'byo createSlice', completed: false }));
/*
  [
    { id: '1', text: 'byo createAction', completed: true }
    { id: '2', text: 'byo createReducer', completed: false }
    { id: '3', text: 'byo createSlice', completed: false }
  ]
*/
store.dispatch(toggleTodo('2'));
/*
  [
    { id: '1', text: 'byo createAction', completed: true }
    { id: '2', text: 'byo createReducer', completed: true }
    { id: '3', text: 'byo createSlice', completed: false }
  ]
*/
```

## `createSlice` implementation

Okay, now that we have our implementation for `createAction` and `createReducer`
built, we can move onto building our `createSlice`.

```js
// helper to build action types scoped to the slice name to avoid naming conflicts
const actionTypeBuilder = (slice) => (action) =>
  slice ? `${slice}/${action}` : action;

export default function createSlice({
  name,
  initialState,
  reducers,
  extraReducers = {},
}) {
  const actionKeys = Object.keys(reducers);
  const createActionType = actionTypeBuilder(name);

  /*
  `createSlice` will create an action for each key:value pair inside the main
  `reducers` property.  `extraReducers` does not create an action for the
  key:value pair which allows outside actions to map to a reducer inside our slice.
  */
  const reducerMap = actionKeys.reduce((map, action) => {
    map[createActionType(action)] = reducers[action];
    return map;
  }, extraReducers);

  // using our `createReducer` :tada:
  const reducer = createReducer(initialState, reducerMap);

  // this builds an object where the key is the actionType and the value is the
  // corresponding actionCreator
  const actionMap = actionKeys.reduce((map, action) => {
    const type = createActionType(action);
    // using our `createAction` :tada:
    map[action] = createAction(type);
    return map;
  }, {});

  return {
    actions: actionMap,
    reducer,
    name,
  };
}
```

#### Example usage for `createSlice`

```ts
import { createStore } from 'redux';

const { reducer, actions } = createSlice({
  name: 'todos',
  initialState = [],
  reducers: {
    addTodo: (state: State, payload: ToDo) => {
      return [...state, action.payload];
    },
    toggleTodo: (state, payload: string) => {
      return state.map((todo) => {
        if (todo.id === payload) {
          return { ...todo, completed: !todo.completed };
        }
        return todo;
      });
    },
  },
});
const { addTodo, toggleTodo } = actions;
console.log(
  addTodo({ id: '1', text: 'build my own createAction', completed: true }),
);
/*
{
  type: 'todos/ADD_TODO',
  payload: { id: '1', text: 'build my own createAction', completed: true },
}
*/

// after this point everything works exactly the same as our previous example
const store = createStore(reducer, []);
store.dispatch(addTodo({ id: '1', text: 'byo createAction', completed: true }));

store.dispatch(
  addTodo({ id: '2', text: 'byo createReducer', completed: false }),
);
store.dispatch(addTodo({ id: '3', text: 'byo createSlice', completed: false }));
/*
  [
    { id: '1', text: 'byo createAction', completed: true }
    { id: '2', text: 'byo createReducer', completed: false }
    { id: '3', text: 'byo createSlice', completed: false }
  ]
*/
store.dispatch(toggleTodo('2'));
/*
  [
    { id: '1', text: 'byo createAction', completed: true }
    { id: '2', text: 'byo createReducer', completed: true }
    { id: '3', text: 'byo createSlice', completed: false }
  ]
*/
// all of our todos are done!
store.dispatch(toggleTodo('3'));
```

## Conclusion

This article demonstrates how leveraging a few simple helper functions
significantly reduces the amount of boilerplate code required to add state and
reducer logic to your redux app. All three of these functions can be used
independently of each other. I also hope this article demystifies `createSlice`,
which is now considered the canonical way to use redux.
