---
title: Scaling a react/redux codebase for multiple platforms
date: '2019-01-15T10:00:00.000Z'
description: A brief intro on expanding a react web app
---

In the world of react and redux, there is no shortage of tutorials, to-do apps,
and how-to guides for small web applications. There's a rather steep learning
curve when trying to deploy a modern web application and when researching how to
scale and maintain a large one, I found very little discussion on the subject.

Another important fact about the react redux ecosystem is that they are simply
libraries. Contrary to what people think, react is not a framework; it's a view
library. That is its strength and also its weakness. For people looking for a
batteries-included web framework to build a single-page application, react only
satisfies the V in MVC. For small, contained applications this is an incredible
ally. React doesn't make any assumptions about how a codebase is organized.
Redux is the same way; the only thing it asks is that the store is immutable.

There is no standard for how to organize a react redux application.
[We cannot even land on a side-effects middleware for it](https://medium.com/magnetis-backstage/redux-side-effects-and-me-89c104a4b149).
This has left the react redux ecosystem fragmented. From
[ducks](https://github.com/erikras/ducks-modular-redux) to rails-style layer
organization, there is no official recommendation. This lack of standardization
is not because the problem has been ignored, in fact, the official redux site
states that
[it ultimately doesn't matter how you lay out your code on disk](https://redux.js.org/faq/code-structure).
I could not disagree more with this sentiment and want to provide how a
developer can scale a react redux application. Whether it is a To-Do app or a
fully-featured email application, I will argue in this blog post how a developer
ought to setup their application.

---

## Inspiration

There really are not a lot of large and open codebases to gain inspiration from.
The most notable examples I have found are
[Automattic's calypso](https://github.com/Automattic/wp-calypso) and most
recently [Keybase's client](https://github.com/keybase/client).

[Uncle Bob's Clean Architecture](https://vimeo.com/43612849) argues that
architecture should describe intent and not implementation. The top-level source
code of a project should not look the same for every project.
[Jaysoo's Organizing Redux Application](https://jaysoo.ca/2016/02/28/organizing-redux-application/)
goes into the details of how to implement a react/redux application using a
feature-based folder organization.

---

## Code Organization

### Monorepo

On a recent project I was responsible for multiple platforms which include but
are not limited to: web (all major browsers), desktop (windows, mac, linux),
outlook plugin, chrome extension, and a salesforce app.

I made the decision that all that code should live under one repository. The
most important reason was for code sharing. I also felt it unnecessary and
unmaintainable to build seven separate repositories.

### A quick overview

I leveraged [yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) to
do all the installation. Every package was located under the `packages` folder.
Each platform had its own folder for customization under the `platform` folder.
Platform specific packages would also be located under the `packages` folder.
Although if desired it would be easy to move platform specific packages under
each platform folder respectively. This made initial setup easier to handle
because all packages lived in one place.

```bash
plaforms/
  web/
    webpack/
    index.js
    store.js
    packages.js
  cli/        # same structure as web
  salesforce/ # same structure as web
  desktop/    # same structure as web
  chrome/     # same structure as web
  outlook/    # same structure as web
packages/
  login/
    packages.json
    index.js
    action-creators.js
    action-types.js
    effects.js
    sagas.js
    reducers.js
    selectors.js
  logout/     # same structure as login
  messages/   # same structure as login
  web-login/  # same structure as login
  cli-login/  # same structure as login
packages.json
```

### Feature-based folder organization

There are two predominate ways to organize code: layer-based and feature-based
folder organization. Uncle Bob's words echo through my halls "architecture
should indicate intent and not implementation." When building an application,
the top level source code should not look the same for every single application.
The rails-style MVC folder structure (layer-based) is not a good approach to
building a large application. Why? One might ask. The main reason for me is it
muddles each feature together into one application instead of treating them as
their own entities. Building a new feature in isolation is more difficult when
each component of a feature needs to join the other features. Using a
feature-based approach, the new feature can be built in isolation, away from
everything else and then "hooked up" later when it's finished.

Layer-based

```bash
src/
  models/
    login.js
    logout.js
  views/
    login.js
    logout.js
  controllers/
    login.js
    logout.js
```

Feature-based

```bash
src/
  login/
    model.js
    view.js
    controller.js
  logout/
    model.js
    view.js
    controller.js
```

### Every feature is an npm package

This was a recent development that has been extremely successful. I leveraged
[yarn workspaces](https://yarnpkg.com/blog/2017/08/02/introducing-workspaces/)
to manage dependencies between features. By developing each feature as a
package, it allowed us to think of each feature as its own individual unit. It
really helps decouple a feature from a particular application or platform. Using
a layer-based approach, it's really easy to lose site that these features are
discrete contributions to an application.

#### Absolute imports

It was a nightmare moving code around when using relative imports for all of our
internal dependencies. In my mind it was a code smell to having an
infrastructure that did not allow us to move code around easily. Absolute
imports were a really great feature to leverage. For large applications it is
imperative to move to an absolutely imported infrastructure when managing
inter-dependencies.

#### Lint rules around inter-dependencies

One of the best things about absolute imports was the lint tooling that could be
built. I used a namespace `@company/<package>` for our imports so it was
relatively easy to build lint rules around that consistent naming.

#### Strict package boundaries

This was another :key: to scaling a codebase. Each package had to subscribe to a
consistent API structure. It forces the developer to think about how packages
are interacting with each other and creates an environment where there is only
one API that each package is required to maintain.

For example, if we allowed any package to import another package, it's difficult
to understand what happens when a developer decides to move files, folders
around. For example when building a package, let's say we want to change the
file `utils` to `helpers`. By allowing a package to import `utils` directly, we
inadvertantly broke the API. Another example is when a package is really simple
and could be encapsulated inside one file. As long as the package has an
`index.js` file and it exports all of the components that another package needs,
it doesn't matter how the package is actually organized.

Another reason why strict module boundaries is important is to simplify the
dependency tree. When reaching into a package to grab a submodule, the
dependency graph treats that submodule as a full-blown package. When creating
module boundaries and a pacakge imports another package, it imports the entire
package. This simplifies the dependency graph and makes it easier to understand.
[Here's an article on the important of dependency graph](http://engineering.khanacademy.org/posts/python-refactor-3.htm).

Each package exports the following:

```js
{
    reducers: Object,
    sagas: Object,
    actionCreators: Object,
    actionTypes: Object,
    selectors: Object,
    utils: Object,
}
```

Creating this consistent API provided opportunities ripe for tooling.

One of the most important rules was the `module-boundary` lint rule. This
prohibited any package from importing a sibling package's submodules directly.
They must always use the `index.js` file to get what they want.

For example:

```js
// bad and a lint rule will prevent this
import { fetchNewsArticle } from '@company/news/action-creators'

// good
import { actionCreators } from '@company/news'
const { fetchNewsArticle } = actionCreators
```

This setup came at a cost. Import statements became more verbose as a result of
this change.

Probably one of the greatest benefits to this structure was circular
dependencies. I know that sounds insane, who would actually want circular
dependencies in their codebase? Especially since every circular dependency that
was introduced caused an ominous runtime error: `cannot find X of undefined`.
I'll go into more details about why these errors were favorable later.

#### A package is a package is a package

Another huge benefit to our "feature-based, everything is an npm package" setup
was the fact that every package was setup the same way. When I onboard new
developers, I usually ask them to add a new feature. What this means is they get
to build their own package that does something new. This made them understand
exactly how a package works and they have plenty of examples on how to build
them. It really reduced the barrier to entry into a massive codebase and was a
great ally when trying to introduce people into a large codebase. With this
architecture, I created a scalable system that anyone can understand.

### Support tools

Because of how tedious it can be to maintain a list of internal dependencies for
each package, not to mention creating `package.json` files for each feature, I
outsourced it to tooling. This was a lot easier than I originally thought.

I leveraged a javascript AST to detect all import statements that matched
`@company/<package>`. This built the list I needed for each package. Then all I
did was hook that script up to our test runner and it would fail a) anytime a
dependency was not inside the package.json or b) whenever there was a dependency
inside the package.json that was no longer detected in the code. I then built an
automatic fixer to update those package.json files that have changed.

Another huge benefit to having internal dependencies within each package was the
ability to quickly look at a `package.json` file and see all of its
dependencies. This allowed us to reflect on the dependency graph on a
per-package basis.

Making our packages npm install-able was easy after this and I don't have to do
anything to maintain those package.json files. Easy!

I wrote the support tools into a CLI
[lint-workspaces](https://github.com/neurosnap/lint-workspaces)

### Package loader

Since I had a consistent API for all of our packages, each platform was able to
load whatever dependencies it needed upfront. Each package exported a `reducers`
object and a `sagas` object. Each platform then simply had to use one of our
helper functions to automatically load our reducers and sagas.

So inside each platform was a `packages.js` file which loaded all reducers and
sagas that were required by the platform and the packages it wanted to use.

By registering the packages, it made it very clear in each platform what kind of
state shape they required and what kind of sagas would be triggered.

```js
// packages.js
import use from 'redux-package-loader'
import sagaCreator from 'redux-saga-creator'

const packages = use([
  require('@company/auth'),
  require('@company/news'),
  require('@company/payment'),
]) // `use` simply combines all package objects into one large object

const rootReducer = combineReducers(packages.reducers)
const rootSaga = sagaCreator(packages.sagas)
export { rootReducer, rootSaga }
```

```js
// store.js
import { applyMiddleware, createStore } from 'redux'
import createSagaMiddleware from 'redux-saga'

export default ({ initState, rootReducer, rootSaga }) => {
  const sagaMiddleware = createSagaMiddleware()
  const store = createStore(
    rootReducer,
    initState,
    applyMiddleware(sagaMiddleware),
  )
  sagaMiddleware.run(rootSaga)

  return store
}
```

```js
// index.js
import { Provider } from 'react-redux';
import { render } from 'react-dom';

import createState from './store';
import { rootReducer, rootSaga } from './packages';
import App from './components/app';

const store = createState({ rootReducer, rootSaga });

render(
    <Provider store={store}>
        <App />
    </Prodiver>,
    document.body,
);
```

I have extracted the package loader code and moved it into its own npm package
[redux-package-loader](https://github.com/neurosnap/redux-package-loader).

I also wrote a saga creator helper
[redux-saga-creator](https://github.com/neurosnap/redux-saga-creator)

### Circular dependencies

Circular dependencies were a very important signal when developing. Whenever I
came across a circular dependency, some feature was organized improperly. It was
a code smell, something I need to get around not by ignoring it, not by trying
to force the build system handle these nefarious errors, but by facing it head
on from an organizational point of view.

One of the :key: topics I learned about along the way was
[Directed acyclic graph](https://en.wikipedia.org/wiki/Directed_acyclic_graph)

I'll explain by example, give the following packages:

```
packages/
    mailbox/
    thread/
    message/
```

I would regularly run into situations where pieces of code within the `mailbox`
package would want to access functionality inside the `thread` package. This
would usually cause a circular dependency. Why? Mailboxes shouldn't need the
concept of a thread to function. However, `thread` needs to understand the
concept of a mailbox to function. This is where DAG came into play. I needed to
ensure that any piece of code inside `mailbox` that needed thread actually
didn't belong inside `mailbox` at all. A lot of the time what it really meant
was I should simply move that functionality into `thread`. Most of the time
making this change made a lot of sense from a dependency point of view, but also
an organizational one. When moving functionality into `thread` did not work or
make any sense, a third package was built that used both `mailbox` and `thread`.

#### Cannot find X of `undefined`

For whatever reason, the build system (webpack, babel) had no problem resolving
circular dependencies even though at runtime I would get this terribly vague
error `cannot find X of 'undefined'`. I would spend hours trying to track down
what was wrong because it was clear that this was a circular dependency issue.
Even when I knew it was a dependency issue, I didn't know what caused it. It was
a terrible developer experience and almost made me give up completely on strict
package boundary setup.

#### Tools to help detect them

Originally the tool that helped detect circular dependency was
[madge](https://github.com/pahen/madge). It was a script that I would run and it
would normally indicate what would be the dependency issue.

Once I moved to yarn workspaces however, this tool failed to work properly.
Thankfully, because every package had an up-to-date `package.json` file with all
inter-dependencies mapped out, it was trivial for to traverse those dependencies
to detect circular issues.

---

## An open example

The project codebase is not publicly accessible but if you want to see some
version of it, you can go to my personal project
[youhood](https://github.com/neurosnap/youhood). It is not a 1:1 clone of the
setup, primarily because I am using TypeScript for my personal project and yarn
workspaces was not necessary to accomplish what I wanted, but it organizes the
code in the exact same way by leveraging `redux-package-loader`.

---

## It's not perfect

There are a few issues when developing an application like this.

- Importing a package brings everything with it
- Import statements are more verbose

In a follow up blog article I will go into more detail about these issues.

---

This code organization could build multiple platforms using most of the same
code. As with most things in life, this was not a silver bullet. They :key:
take-aways were:

- Feature-based organization scaled really well
- A consistent package interface allowed for tooling
- Force developers to think about dependency graph

---

## References

- [redux-package-loader](https://github.com/neurosnap/redux-package-loader)
- [redux-saga-creator](https://github.com/neurosnap/lint-workspaces)
- [lint-workspaces](https://github.com/neurosnap/lint-workspaces)
- [tslint-package-config](https://github.com/neurosnap/tslint-package-config)
- [youhood](https://github.com/neurosnap/youhood)
