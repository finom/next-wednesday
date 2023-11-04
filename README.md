# next-wednesday 🐸 

<p align="center">
<img src="https://github.com/finom/nextjs-alternative-router/assets/1082083/6e1bd491-4d8f-4144-b57f-cefb20cd01e1" width="500"  />
<br />
<a href="https://www.npmjs.com/package/next-wednesday">
<img src="https://badge.fury.io/js/next-wednesday.svg" alt="npm version" /> 
</a>
<a href="https://www.typescriptlang.org/">
<img src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg" alt="TypeScript" /> 
</a>
<a href="https://github.com/finom/next-wednesday/actions/workflows/main.yml">
<img src="https://github.com/finom/next-wednesday/actions/workflows/main.yml/badge.svg" alt="Build status" />
</a>
</p>

<p align="center">
<strong>A compact, <a href="https://bundlephobia.com/package/next-wednesday">zero-dependency</a> library that constructs Next.js 13+ App Route Handlers from decorated classes, serving as a "nano-sized NestJS" within the Next.js environment.</strong>
<br />
<em>4 minutes of reading</em>
</p>

<!-- toc -->

- [Features](#features)
- [Quick start](#quick-start)
- [Overview](#overview)
  * [Why Next.js is great?](#why-nextjs-is-great)
  * [Why Next.js API routes suck?](#why-nextjs-api-routes-suck)
  * [A potential solution: Pairing Next.js with NestJS](#a-potential-solution-pairing-nextjs-with-nestjs)
  * [The new solution: Next Wednesday](#the-new-solution-next-wednesday)
    + [Custom decorators](#custom-decorators)
      - [`authGuard` example](#authguard-example)
      - [`handleZodErrors` example](#handlezoderrors-example)
    + [Service-Controller pattern](#service-controller-pattern)
    + [Return type](#return-type)
    + [Error handling](#error-handling)
  * [Alternative libraries](#alternative-libraries)
- [API](#api)
  * [`createController`, global decorators and handlers](#createcontroller-global-decorators-and-handlers)
  * [`HttpException` and `HttpStatus`](#httpexception-and-httpstatus)
  * [`createDecorator`](#createdecorator)

<!-- tocstop -->

## Features

Next Wednesday offers a range of features to streamline your Next.js routing experience:

- Elegant decorator syntax (all HTTP methods are available).
- Custom decorators for varied needs are supported.
- Direct data return from the handler (`Response` or `NextResponse` usage isn't required).
- Beautiful error handling (no need to use `try..catch` and `NextResponse` to return an error to the client).
- Service-Controller pattern is supported.
- Partial refactoring is possible if you want to quickly try the library or update only particular endpoints with an isolated controller (see `createController` docs below).
- Retains built-in Next.js features; use plain `req: NextRequest` to access body, query, etc; use `next/navigation` for redirects and `next/headers` to handle headers.

## Quick start

Install: `npm i next-wednesday` or `yarn add next-wednesday`.

Create the first controller:

```ts
// /src/controllers/UserController.ts
import { get, post, prefix } from 'next-wednesday';

@prefix('users') 
export default class UserController {
  @get() // Handles GET requests to '/api/users'
  static getHelloWorld() {
    return { hello: 'world' };
  }

  @post('hello/:id/world') // Handles POST requests to '/api/users/hello/:id/world'
  static postHelloWorld(req: NextRequest, { id }: { id: string }) {
    const q = req.nextUrl.searchParams.get('q');
    const body = await req.json();
    return { id, q, body };
  }
}
```

Finally, create the catch-all route with an optional slug (`[[...slug]]`). The slug is never used so you may want to keep it empty (`[[...]]`).

```ts
// /src/app/api/[[...]]/route.ts
import { RouteHandlers } from 'next-wednesday';
import '../../../controllers/UserController';

export const { GET, POST } = RouteHandlers;
```

After that you can load the data using any fetching library.

```ts
fetch('/api/users');
fetch(`/api/users/hello/${id}/world?q=aaaah`, {
  method: 'POST', 
  body: JSON.stringify({ hello: 'world' }),
});
```

## Overview

### Why Next.js is great?

Next.js 13+ with App Router is a great ready-to-go framework that saves a lot of time and effort setting up and maintaining a React project. With Next.js:

- You don't need to manually set up Webpack, Babel, ESLint, TypeScript.
- Hot module reload is enabled by default and always works, so you don't need to find out why it stopped working after a dependency update.
- Server-side rendering is enabled by default.
- Routing and file structure are well-documented, eliminating the need for custom design.
- It doesn't require you to "eject" scripts and configs if you want to modify them.
- It's a widely known and well-used framework, no need to spend time thinking of a choice.

As result both long-term and short-term the development is cheaper, faster and more efficient.

### Why Next.js API routes suck?

The pros mentioned above are about front-end part (code used by `page.tsx`, `layout.tsx`, `template.tsx` etc), but the API route handlers provide very specific and very limited way to define API routes. Per every endpoint you're going to create a separate file called `route.ts` that exports route handlers that implement an HTTP method corresponding to their name:

```ts
export async function GET() {
  // ...
  return NextResponse.json(data)
}

export async function POST() {
  // ...
  return NextResponse.json(data)
}
```

Let's imagine that your app requires to build the following endpoints:

```
GET /user - get all users
POST /user - create user
GET /user/me - get current user
PUT /user/me - update current user (password, etc)
GET /user/[id] - get specified user by ID
PUT /user/[id] - update a specified user (let's say, name only) 
GET /team - get all teams
GET /team/[id] - get a specific team
POST /team/[id]/assign-user - some specialised endpoint that assigns a user to a specific team (whatever that means)
```

With the built-in Next.js 13+ features your API folder structure is going to look the following:

```
/api/user/
  /route.ts
  /me/
    /route.ts
  /[id]/
    /route.ts
/api/team/
  /route.ts
  /[id]/
    /route.ts
    /assign-user/
      /route.ts

```

It's hard to manage this file structure (especially if you have complex API), and you may want to apply some creativity to reduce number of files and simplify the structure:

- Move all features from /users folder (`/me` and `/[id]`) to `/user/route.ts` and use query parameter instead: `/user`, `/user/?who=me`, `/user/?who=[id]`
- Do the same trick with the teams: `/team`, `/team?id=[id]`, `/team?id=[id]&action=assign-user`

The file structure now looks like the following:

```
/api/user/
  /route.ts
/api/team/
  /route.ts
```

It looks better (even though it still looks wrong) but the code inside these files make you write too many `if` conditions and will definitely make your code less readable. To make this documentation shorter, let me rely on your imagination.

### A potential solution: Pairing Next.js with NestJS

Last few years I solved the problem above by combining Next.js and NestJS framework in one project. Next.js was used as a front-end framework and NestJS was used as back-end framework. Unfortunately this solution requires to spend resources on additional code and deployment management:

- Should it be a monorepo or 2 different repositories? 
  - Monorepo is harder to manage and deploy.
  - Two repos are harder to synchronize (if deployed back-end code and front-end code compatible to each other at this moment of time?).
- Both applications require to be run on their own port and we need to deploy them to 2 different servers.

It would be nice if we could:

- Use a single NodeJS project run in 1 port;
- Keep the project in one simple repository;
- Use single deployment server;
- Apply NestJS-like syntax to define routes;
- Make the project development and infrastructure cheaper.

### The new solution: Next Wednesday

Next.js includes [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) that enable us to create "catch-all" route handlers for a specific endpoint prefix. The library uses this feature to implement creation of route handlers with much more friendly syntax. The route handlers are going to be exported on one catch-all route file. To achieve that you're going to need to create the following files:

```
/api/[[...]]/route.ts
/controllers
  /UserController.ts
  /TeamController.ts
```

First, `/controllers` is a folder that contains our dynamic controller files. The names of the folder and files don't matter so you can name it `/routers` for example.

Create your controllers:

```ts
// /controllers/UserController.ts
import { get, post, put, prefix } from 'next-wednesday';

@prefix('users')
export default class UserController {
  @get()
  static getAll() {
    return someORM.getAllUsers();
  }

  @get('me')
  static getMe() {
    // ...
  }

  @put('me')
  static async updateMe(req: NextRequest) {
    const body = await req.json() as { firstName: string; lastName: string; };
    // ...
  }

  @get(':id')
  static async getOneUser(req: NextRequest, { id }: { id: string }) {
    return someORM.getUserById(id);
  }

  @put(':id')
  static async updateOneUser(req: NextRequest, { id }: { id: string }) {
    const body = await req.json() as { firstName: string; lastName: string; };

    return someORM.updateUserById(id, body);
  }
}
```

```ts
// /controllers/TeamController.ts
import { get, post, prefix } from 'next-wednesday';

@prefix('teams')
export default class TeamController {
  @get()
  static getAll() {
    return someORM.getAllTeams();
  }

  @get(':id')
  static getOneTeam(req: NextRequest, { id }: { id: string }) {
    // ...
  }

  @post(':id/assign-user') 
  static assignUser() {
    // ...
  }
}
```

Finally, create the catch-all route.

```ts
// /api/[[...]]/route.ts - this is a real file path where [[...]] is a folder name
import { RouteHandlers } from 'next-wednesday';
import '../controllers/UserController';
import '../controllers/TeamController';

export const { GET, POST, PUT } = RouteHandlers;
```

That's it. There are facts that you may notice:

- The syntax is very similar to [NestJS](https://nestjs.com/) (but I don't have a goal to make another NestJS though).
- The methods modified by the decorators defined as `static` methods and the classes are never instantiated.
- The returned values don't have to be instances of `NextResponse` or `Response`, but they can be if needed.
- Classes are imported for side effects to register global controller routes (see `createController` docs below).

Also it's worthy to mention that `@prefix` decorator is just syntax sugar and you're not required to use it.

#### Custom decorators

You can extend features of the controller by defining a [custom decorator](https://www.typescriptlang.org/docs/handbook/decorators.html) that can:

- Run additional request validation, for example to check if user is authorised.
- Catch specific errors.
- Add more properties to the `req` object: current user, parsed and modified request body, etc.

There is typical code from a random project:

```ts
// ...
export default class MyController {
  // ...

  @post()
  @authGuard()
  @permissionGuard(Permission.CREATE)
  @handleZodErrors()
  static async create(req: GuardedRequest) {
    const body = ZodModel.parse(await req.json());

    return this.myService.create(body);
  }

  // ...
}
```

To create a decorator you can use `createDecorator`.

##### `authGuard` example

There is the example code that defines `authGuard` decorator that does two things:

- Checks if a user is authorised and returns an Unauthorised status if not.
- Adds `currentUser` to the request object.

To extend `req` object you can define your custom interface that extends `NextRequest`.

```ts
// types.ts
import { type NextRequest } from 'next/server'
import { type User } from '@prisma/client';

export default interface GuardedRequest extends NextRequest {
  currentUser: User;
}
```

Then define the `authGuard` decorator itself.

```ts
// authGuard.ts
import { HttpException, HttpStatus, createDecorator } from 'next-wednesday';
import { NextRequest } from 'next/server';
import checkAuth from './checkAuth';

const authGuard = createDecorator(async (req: GuardedRequest, next) => {
  // ... define userId and isAuthorised
  // parse access token for example

  if (!isAuthorised) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  // let's imagine you use Prisma and you want to find a user by userId
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });

  req.currentUser = currentUser;

  return next();
});

export default authGuard;
```

And finally use the decorator as we did above:

```ts
// ...
export default class UserController {
  // ...
  @get('me')
  @authGuard()
  static async getMe(req: GuardedRequest) {
    return req.currentUser;
  }

  // ...
}
```

##### `handleZodErrors` example

You can catch any error in your custom decorator and provide relevant response to the client. At this exmple we're checking if `ZodError` is thrown. 

```ts
import { ZodError } from 'zod';
import { HttpException, HttpStatus, createDecorator } from 'next-wednesday';

const handleZodErrors = createDecorator(async (req, next) => {
  try {
    return await next();
  } catch (e) {
    if (e instanceof ZodError) {
      throw new HttpException(
        HttpStatus.BAD_REQUEST,
        e.errors?.map((error) => `${error.code}: ${error.message}`).join('; ') ?? 'Validation error'
      );
    }

    throw e;
  }
});

export default handleZodErrors;
```

If `ZodModel.parse` encounters an error and throws a `ZodError` the decorator is going to catch it and return corresponding response.

```ts
// ...
export default class UserController {
  // ...
  @post()
  @handleZodErrors()
  static async create(req: NextRequest) {
    const data = ZodModel.parse(await req.json());
  }

  // ...
}
```

#### Service-Controller pattern

Optionally, you can improve your controller code by splitting it into service and controller. Service is a place where you make database requests and perform other data manipulation actions. Controller is where we use the decorators, check permissions, and validate incoming data, then call methods of the service. To achieve that, create another simple class (without no parent or decorators) with static methods:

```ts
// /controllers/user/UserService.ts
export default class UserService {
  static findAllUsers() {
    return prisma.user.findMany();
  }
}

```

Then inject the service as another static property to the controller

```ts
// /controllers/user/UserController.ts
import UserService from './UserService';

// ...
@prefix('users')
export default class UserController {
  static userService = UserService;

  @get()
  @authGuard()
  static getAllUsers() {
    return this.userService.findAllUsers();
  }
}

```

Then initialise the controller as before:

```ts
// /api/[[...]]/route.ts
import { RouteHandlers } from 'next-wednesday';
import '../controllers/user/UserController';

export const { GET } = RouteHandlers;
```

Potential file structure with users, posts and comments may look like that:

```
/controllers/
  /user/
    /UserService.ts
    /UserController.ts
  /post/
    /PostService.ts
    /PostController.ts
  /comment/
    /CommentService.ts
    /CommentController.ts
```


#### Return type

Controller method can return an instance of `NextResponse` (or `Response`) as well as custom data. Custom data is serialised to JSON and returned with status 200.

```ts
@get()
static getSomething() {
  // same as NextResponse.json({ hello: 'world' }, { status: 200 })
  return { hello: 'world' };
}
```


#### Error handling

You can throw errors directly from the controller method. The library catches thrown exception and returns an object of type `ErrorResponseBody`.

```ts
// some client-side code
import { type ErrorResponseBody } from 'next-wednesday';

const dataOrError: MyData | ErrorResponseBody = await (await fetch()).json();
```

The shape of this type is the following:

```ts
interface ErrorResponseBody {
  statusCode: HttpStatus;
  message: string;
  isError: true;
}
```

To throw an error you can use `HttpException` class together with `HttpStatus` enum. You can also throw the errors from the service methods.

```ts
import { HttpException, HttpStatus } from 'next-wednesday'

// ...
@get()
static getSomething() {
  if(somethingWrong) {
    throw new HttpException(HttpStatus.I_AM_A_TEAPOT, "I'm a teapot");
  }
  // ...
}
// ...
```

All other exceptions are considered as 500 errors and handled similarly.

```ts
// ...
@get()
static getSomething() {
  if(somethingWrong) {
    throw new Error('Something is wrong');
  }
  // ...
}
// ...
```

### Alternative libraries

- [next-api-decorators](https://github.com/instantcommerce/next-api-decorators) - Decorators to create typed Next.js API routes, with easy request validation and transformation.

Feel free to add your library to this list!

## API

```ts
import { 
  // main API
  type ErrorResponseBody, 
  HttpException, 
  HttpStatus, 
  createController,
  createDecorator,

  // global controller members created with createController
  get, post, put, patch, del, head, options, 
  prefix, 
  RouteHandlers,
} from 'next-wednesday';
```

### `createController`, global decorators and handlers

The function `createController` initialises route handlers for one particular app segment and creates isolated controller. Using the function directly allows you to isolate some particular route path from other route handlers and provides a chance to refactor your code partially. Let's say you want to override only `/users` route handlers by using the library but keep `/comments` and `/posts` as is. 


```
/api/posts/
  /route.ts
  /[id]/
    /route.ts
/api/comments/
  /route.ts
  /[id]/
    /route.ts
/api/users/[[...]]/
  /route.ts
```

In this example, only the `users` dynamic route will utilize the library. With `createController` you can define local variables that are going to be used for one particular path. At this case the controller class is going to be extended by `RouteHandlers` class (to avoid "var is declared but its value is never read" error).

```ts
import { createController } from 'next-wednesday';

const { get, post, RouteHandlers } = createController();

class UserRoute extends RouteHandlers {
  @get()
  static getAll() {
    // ...
  }

  @post()
  static create() {
    // ...
  }
}

export const { GET, POST } = UserRoute;
```

This is what `createController` returns:

```ts
const {  
  get, post, put, patch, del, head, options, // HTTP methods
  prefix, 
  RouteHandlers, 
} = createController();
```

(notice that DELETE method decorator is shortned to `@del`).

`RouteHandlers` includes all route handlers for all supported HTTP methods.

```ts
export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD } = RouteHandlers;
```

As you may already guess, some of the the variables imported from the library are created by `createController` to keep the code cleaner for the "global" controller instance.

```ts
// these vars are initialised within the library by createController
import {
  get, post, put, patch, del, head, options, 
  prefix, 
  RouteHandlers,
} from 'next-wednesday';
```


### `HttpException` and `HttpStatus`


`HttpException` accepts 2 arguments. The first one is an HTTP code that can be retrieved from `HttpStatus`, the other one is error text.

```ts
import { HttpException, HttpStatus } from 'next-wednesday';

// ...
throw new HttpException(HttpStatus.BAD_REQUEST, 'Something went wrong');
```

### `createDecorator`

`createDecorator` is a higher-order function that produces a decorator factory (a function that returns a decorator). It accepts a middleware function with the following parameters:


- `request`, which extends `NextRequest`.
- `next`, a function that should be invoked and its result returned to call subsequent decorators or the route handler.
- Additional arguments are passed through to the decorator factory.

```ts
import { NextResponse } from 'next';
import { createDecorator, get } from 'next-wednesday';

const myDecorator = createDecorator((req, next, a: string, b: number) => {
  console.log(a, b); // Outputs: "foo", 1

  if(isSomething) { 
    // override route method behavior and return { hello: 'world' } from the endpoint
    return { hello: 'world' };
  }

  return next();
});

class MyController {
  @get()
  @myDecorator('foo', 1) // Passes 'foo' as 'a', and 1 as 'b'
  static get() {
    return {};
  }
}
```

Enjoy!
