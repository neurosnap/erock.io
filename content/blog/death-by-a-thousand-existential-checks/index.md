---
title: Death by a thousand existential checks
date: '2020-08-12T00:00:00.000Z'
description: How to avoid existential checks in your codebase
---

Existential checks are when we have to detect whether or not a variable has a
value - that is, checking to see if a variable exists. If the value is `null`,
`undefined` or otherwise falsy, then it fails the check. This usually takes the
form of an if-statement.

```ts
if (thingThatExists) {
  // do something with `thingThatExists`
}
```

They are a natural - and often necessary - part of codebases. However, their
over abundance can make the readability of the codebase difficult. When
existential checks are nested within existential checks, it becomes difficult to
understand the context of the code we are trying to read.

As we will demonstrate in this article, **where** they are used has a dramatic
effect on code reuse, readability, and maintainability.

# What's the problem with existential checks?

## It increases code nesting

As code structure determines its function, the graphic design of code determines
its maintainability. Indentation - while necessary for visualizing the flow
control a program - is often assumed to be merely an aesthetic appeal. However,
what if indentation can help determine unnecessary code complexity?
[Abrupt code indentation tends to convolute control flow with minor details.](http://hjemmesider.diku.dk/~jyrki/Course/Software-development-2008/Slides/pretty-code.pdf)
Linus Torvalds thinks that greater than three levels of indentation is a code
smell which is part of a greater design flaw

> Now, some people will claim that having 8-character indentations makes the
> code move too far to the right, and makes it hard to read on a 80-character
> terminal screen. The answer to that is that if you need more than 3 levels of
> indentation, you're screwed anyway, and should fix your program.

Jeff Atwood thinks that nesting code has a high
[cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
value which is a measure of how many distinct paths there are through code.
[A lower cyclomatic complexity value correlates with more readable code, and also indicates how well it can be properly tested.](https://blog.codinghorror.com/flattening-arrow-code/)

## Deeply nested structures are a bad idea.

I started my career in software engineering by trying many different programming
languages. I took something along with me after diving into writing _pragmatic_
and _ideomatic_ code for each language. For example, when I started learning
python, I stumbled upon Python Enhancement Proposals (PEP). From PEP 01:

> A PEP is a design document providing information to the Python community, or
> describing a new feature for Python or its processes or environment.

There are a couple PEP's that are cited very often, one of which is
[PEP 20](https://www.python.org/dev/peps/pep-0020/). It describes a set of
design principles that every python developer should think about when
architecturing a codebase. There's one line in this principle that I think about
all the time:

> Flat is better than nested

This guiding principle has led me to what I believe is more maintainable,
readable code. When we apply this principle to data structures, that means we
should avoid deeply nested data structures.

Deeply nested structures are difficult to understand -- even when strongly typed
-- and they tend to promote cases where a nested object could be empty. This has
the consequence of requiring developers to make many existential checks,
especially if the data is used often.

Redux also has an great set or recommendations for organizing application state
that also
[strongly recommends normalizing state](https://redux.js.org/style-guide/style-guide#normalize-complex-nestedrelational-state).

There are many articles about
[how to normalize state](https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape),
but the tldr is to think of an application's state like a relational database:
each object is a database table where the key is the `id` and the value is the
object data. This makes data easier to query, update, and reuse. If you inspect
Aptible's redux state, it is very flat and scales very well.

## It sets poor expectations for other developers and makes it harder for them to grok the codebase.

When objects _can_ be empty, it sets terrible expectations for the end
developer. Here are some questions it can raise:

- When do these data get populated?
- How do I ensure we will have the data when I need to use them?
- What do I do when we don't have the data?

Working with many developers across multiple squads at Aptible, it is important
for us to set clear expectations with our code. Setting expectations leads to
more readable and manageable code. Because we use TypeScript at Aptible, we set
expectations through our interfaces. When interfaces are littered with optional
or nullable properties, we set terrible expectations. Therefore, we make a
concerted effort to minimize the number of optional or nullable properties in
our front-end codebase.

## It usually means we forgot an important step in our data pipeline.

When it comes to web development, we regularly have to build a pipeline to
consume an API that is usually a separate service, constructed by a set of HTTP
endpoints that we have to
[extract, transform, and load](https://en.wikipedia.org/wiki/Extract,_transform,_load)
into our front-end application. When I first started building front-end web
applications, I got into a really bad habit of skipping the _transform_ step. I
would take the API response and load it directly into my application state. By
ignoring the transformation step, it made it harder to make updates to the
codebase when an API endpoint changed. APIs are not always built with the
consumers in mind. They are built in terms of being RESTful, with strict rules
on how data should be formed and sent to their consumers.

Another side-effect of ignoring the transformation step is pushing optional
properties to the view layer (e.g. react components). There's no quicker way to
complicate a react component than to make a bunch of existential checks inside
the render body even if it uses the new syntax sugar of
[optional chaining](https://github.com/tc39/proposal-optional-chaining).

```tsx
import { useSelector } from 'react-redux';

interface SocialLinks {
  id: string;
  website?: string;
  github?: string;
  twitter?: string;
}

interface Author {
  id: string;
  username: string;
  name: string;
  social: SocialLinks | null;
}

interface Blog {
  id: string;
  body: string;
  author: Author | null;
}

interface Props {
  blogId: string;
}

const selectBlogs = (state) => state.blogs || {};
const selectBlogById = (state, { id }: { id: string }) =>
  selectBlogs(state).[id];

const BlogArticle = ({ blogId }: Props) => {
  const blog = useSelector(
    (state) => selectBlogById(state, { id: blogId })
  );
  if (!blog) {
    return <div>Could not find blog article</div>;
  }

  return (
    <div>
      <div>{blog.body}</div>
      written by: {blog?.author.name}
      website: {blog?.author?.social.website || ''}
      github: {blog?.author?.social.github || ''}
      twitter: {blog?.author?.social.twitter || ''}
    </div>
  );
};
```

This example is meant to demonstrate how code can become more complicated when
there are existential checks inside our react components. We have made no
guarantees for the data we are sending to the view layer and as a result we have
to make many existential checks and fallbacks to accommodate.

# How do we avoid existential checks?

## Make optional properties the exception, not the rule

Instead of accepting what the backend sends us, we should instead create a
consistent and reliable set of data structures that our app uses. Optional
properties should be an exception, not the rule. Let's build some _ideal_
interfaces without optional or nullable properties and then figure out how to
build our state with it.

```ts
interface SocialLinks {
  id: string;
  website: string;
  github: string;
  twitter: string;
}

interface Author {
  id: string;
  username: string;
  name: string;
  social: SocialLinks;
}

interface Blog {
  id: string;
  body: string;
  author: Author;
}
```

It's a pretty simple exercise, we go through and remove the possibility of a
property not existing or the property being `null`. Already I'm feeling more
confident about these entities and what I can expect from them. This is great,
but how do we make this interface a reality with the data we are being provided?

## Build entity factories

The general approach to retrieving data from our redux store is to always send
the object that the user is requesting. Instead of our selector potentially
returning `null` or `undefined`, we can return a default blog object, with sane
defaults for each property. This is a concept inspired by golang. Variables
without an initial value are
[set to their zero value](https://golang.org/ref/spec#The_zero_value). This
means that every entity in our front-end codebase has an entity creation
function that accepts a partial of that entity and does a simple merge.

```ts
const defaultSocialLinks = (social: Partial<SocialLinks> = {}): SocialLinks => {
  return {
    id: '',
    website: '',
    github: '',
    twitter: '',
    ...social,
  };
};

const defaultAuthor = (author: Partial<Author> = {}): Author => {
  return {
    id: '',
    username: '',
    name: '',
    social: defaultSocialLinks(author.social),
    ...author,
  };
};

const defaultBlog = (blog: Partial<Blog> = {}): Blog => {
  return {
    id: '',
    body: '',
    author: defaultAuthor(blog.author),
    ...blog,
  };
};
/*
  console.log(
    defaultBlog({ id: '123', body: 'blog content!' })
  );
  {
    id: '123',
    body: 'some content!',
    author: {
      id: '',
      username: '',
      name: '',
      social: {
        id: '',
        website: '',
        github: '',
        twitter: '',
      }
    }
  }
*/
```

This concept of creating default entities or
[fabricators](https://www.fabricationgem.org/) is a concept used in ruby,
primarily for specs but also can be used for anything.

By spending a little up-front time building entity factories, we save a ton of
time for every end-developer that needs to create a new entity. It seems
tedious, but we've been able to scale this concept to even massive entities with
good ROI. Our human labor _will_ pay off. We're not using a library to do this
for us - it's straight-forward and easy to copy/paste.

Default entity functions help:

- Guarantee all objects and properties to exist
- Do the heavy lifting to creates sane defaults for all entities and their
  properties
- Create a central place to generate the entity
- Create an entity while also passing in other property values
- Test in a type-safe manner by avoiding casting to `any` simply because
  building an entity object manually in every test is tedious

## Transform data from HTTP requests

Back to the fundamentals of ETL, it is imperative that we do **not** skip
building the _T_ in _ETL_. The way we do this is by creating a deserializer for
each entity in our API responses.

You can see in our responses where our original interfaces came from: this is
what the API is sending us. We shouldn't continue the trend of maybe having
properties or maybe having an object.

```ts
interface SocialLinksResponse {
  id: string;
  website?: string;
  github?: string;
  twitter?: string;
}

interface AuthorResponse {
  id: string;
  user_name: string;
  name: string;
  social: SocialLinksResponse | null;
}

interface BlogResponse {
  id: string;
  body: string;
  author: Author | null;
}

// always type yor API responses!
interface BlogCollectionResponse {
  blogs: BlogResponse[];
}

// always create a deserializer for each entity
function deserializeBlog(blog: BlogResponse): Blog {
  return {
    id: blog.id,
    body: blog.body,
    author: deserializeAuthor(blog.author),
  };
}

function deserializeAuthor(author: AuthorResponse | null): Author {
  if (!author) {
    return defaultAuthor();
  }

  // you can see here that we change
  // the API response from `user_name` to `username`
  return {
    id: author.id,
    username: author.user_name,
    name: author.name,
    social: deserializeSocialLink(author.social),
  };
}

function deserializeSocialLink(
  social: SocialLinksResponse | null,
): SocialLinks {
  if (!social) {
    return defaultSocial();
  }

  // here we do some transformations to set sane
  // values for when a property doesn't exist
  return {
    id: social.id,
    website: social.website || '',
    github: social.github || '',
    twitter: social.twitter || '',
  };
}

async function fetchBlogs() {
  const resp = await fetch('/blogs');
  if (!resp.ok) {
    // TODO: figure out error handling
    return;
  }
  const data: BlogCollectionResponse = await resp.json();
  const blogs = data.blogs.map(deserializeBlog);
  // TODO: save to redux
}
```

This seems tedious, but a developer writes it once and now we have:

- A fully typed API response
- Fully typed deserializers for every entity that we are going to use
- A set of transformers where we can change the structure or format of the data
  being returned from the API
- Sane defaults for the data we receive

This ETL structure is the basis of our front-end business logic and has scaled
well to date.

## Avoid existential checks in react components

All of the work in the previous sections should pay off now, let's see what it
looks like.

```tsx
import { useSelector } from 'react-select';

interface SocialLinks {
  id: string;
  website: string;
  github: string;
  twitter: string;
}

interface Author {
  id: string;
  username: string;
  name: string;
  social: SocialLinks;
}

interface Blog {
  id: string;
  body: string;
  author: Author;
}

const fallbackBlog = defaultBlog({
  body: 'Could not find blog article',
});
const selectBlogs = (state) => state.blogs;
// here we use a fallback blog for when
// we cannot find the blog article
const selectBlogById = (state, { id }: { id: string }) =>
  selectBlogs(state)[id] || fallbackBlog;

const BlogArticle = ({ blogId }: Props) => {
  const blog = useSelector((state) => selectBlogById(state, { id: blogId }));
  return (
    <div>
      <div>{blog.body}</div>
      written by: {blog.author.name}
      website: {blog.author.social.website}
      github: {blog.author.social.github}
      twitter: {blog.author.social.twitter}
    </div>
  );
};
```

What did we accomplish?

- We created a fallback for our selector with a message saying we couldn't find
  the blog
- We have removed branching logic inside our component
- We removed all existential checks from our component
- We removed the need to have multiple `x || ''` inside of our component
- This component is now completely safe to render even if we know we don't have
  any blog articles yet!

This last point is interesting: we don't **need** a loader to prevent this code
from throwing an error, it's safe to use while data is being fetched. We can
defer implementing loading states until later.

One could argue we are overloading the meaning of `body` by placing the error
message inside it. I think that's fair, but ultimately this has rarely been an
issue and it really cleans the code up. I personally don't see an issue with it,
but if we want, we could instead do a single existential check on the `id` of
the blog entity and then return early:

```tsx
const blog = useSelector((state) => selectBlogById(state, { id: blogId }));
if (!blog.id) {
  return <div>Could not find blog article</div>;
}
// ...
```

## One more thing: Flat is better than nested

I really like how we simplified our react component, there's virtually no logic
involved because we pushed all of that complexity into our transform step. We do
the leg-work once and now everything downstream of it can enjoy type and render
safe entities without any optional or missing properties.

We're not done yet. I really do not like how we have nested objects in our
entities. I want to normalize this data so we can query for them separate of
querying for the entire blog object. Maybe I want a page where I list all
authors using the same card we built for the blog article. It seems silly to
traverse all blogs first, then deduplicate the list of authors, and then render
the authors.

```tsx
interface SocialLinks {
  id: string;
  website: string;
  github: string;
  twitter: string;
}

interface Author {
  id: string;
  username: string;
  name: string;
  socialId: string;
}

interface Blog {
  id: string;
  body: string;
  authorId: string;
}

interface State {
  blog: { [id: string]: Blog | undefined };
  author: { [id: string]: Author | undefined };
  social: { [id: string]: Social | undefined };
}

function deserializeBlog(blog: BlogResponse): Blog {
  const author = deserializeAuthor(blog.author);

  return {
    id: blog.id,
    body: blog.body,
    authorId: author.id,
  };
}

function deserializeAuthor(author: AuthorResponse | null): Author {
  if (!author) {
    return defaultAuthor();
  }

  const social = deserializeSocialLink(author.social);
  return {
    id: author.id,
    username: author.user_name,
    name: author.name,
    socialId: author.social.id,
  };
}

function deserializeSocialLink(
  social: SocialLinksResponse | null,
): SocialLinks {
  if (!social) {
    return defaultSocialLink();
  }

  return {
    id: social.id,
    website: social.website || '',
    github: social.github || '',
    twitter: social.twitter || '',
  };
}

async function fetchBlogs() {
  const resp = await fetch('/blogs');
  if (!resp.ok) {
    // TODO: figure out error handling
    return;
  }
  const data: BlogCollectionResponse = await resp.json();
  const blogs = [];
  const authors = [];
  const socialLinks = [];

  // we process the data once so we don't
  // have to perform existential checks in our
  // react components
  data.blogs.forEach((blog) => {
    blogs.push(deserializeBlog(blog));
    const author = blog.author;

    if (author) {
      authors.push(deserializeAuthor(author));
      const socialLink = author.social;

      if (socialLink) {
        socialLinks.push(deserializeSocialLinks(socialLink));
      }
    }
  });
  // TODO: save to redux
}

const fallbackSocial = defaultSocialLinks();
const selectSocial = (state: State) => state.social;
const selectSocialById = (state: State, { id }: { id: string }) =>
  selectSocial(state)[id] || fallbackSocial;

const fallbackAuthor = defaultAuthor({ name: 'Unknown' });
const selectAuthors = (state: State) => state.authors;
const selectAuthorsById = (state: State, { id }: { id: string }) =>
  selectAuthors(state)[id] || fallbackAuthor;

const fallbackBlog = defaultBlog({ body: 'Could not find blog article' });
const selectBlogs = (state: State) => state.blogs;
// here we use a fallback blog for when we cannot find the blog article
const selectBlogById = (state: State, { id }: { id: string }) =>
  selectBlogs(state)[id] || fallbackBlog;

const AuthorCard = ({ authorId }: { authorId: string }) => {
  const author = useSelector((state: State) =>
    selectAuthorById(state, { id: authorId }),
  );
  const social = useSelector((state: State) =>
    selectSocialById(state, { id: author.socialId }),
  );

  return (
    <div>
      <div>
        {author.name} ({author.username})
      </div>
      website: {social.website}
      github: {social.github}
      twitter: {social.twitter}
    </div>
  );
}

const BlogArticle = ({ blogId }: Props) => {
  const blog = useSelector((state: State) =>
    selectBlogById(state, { id: blogId }),
  );

  return (
    <div>
      <div>{blog.body}</div>
      <AuthorCard authorId={blog.authorId} />
    </div>
  );
};

const AuthorsPage = () => {
  const authorMap = useSelector(selectAuthors);
  const authorIds = useMemo(() => Object.keys(authorMap), [authorMap]);

  return authorIds.map((authorId) => (
    <AuthorCard key={authorId} authorId={authorId}>
  ));
};
```

Is it more code? Absolutely. The goal of flattening our objects is not to save
on lines of code; rather, it's to build a scalable, readable, and maintainable
architecture that is predictable to use.

Architecting code is hard. With a little planning and pushing a few existential
checks the transform layer of ETL, we end up with a repeatable pattern for
dealing with optional or nullable properties, and making our view layer easier
to build.
