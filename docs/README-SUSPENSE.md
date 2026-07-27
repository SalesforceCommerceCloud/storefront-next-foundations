# Loading States

Visual stability means that a page's layout remains predictable and free of unexpected shifts as content loads. Loading states help achieve this and provide users with clear visual feedback about ongoing asynchronous operations, such as data fetching. React Router exposes two distinct mechanisms for managing loading states: declarative and imperative. Both mechanisms serve the same user-facing goal, communicating that an operation is in progress. They differ in where and how the loading state is defined and consumed. The appropriate choice depends on the scope and trigger of the async operation.

> [!NOTE]
> This documentation builds on [Data Fetching](README-DATA.md). In the context of classifying data as critical and non-critical, the term visual stability was mentioned in [Data Fetching](README-DATA.md#data-classification), along with its relevance to user-perceived, or psychological, performance characteristics of a web app.

## Declarative Loading States

Declarative loading states are defined structurally in the component tree via React's [`<Suspense/>`](https://react.dev/reference/react/Suspense) component.

`Suspense` acts as an asynchronous boundary: it intercepts rendering of any child component that isn't yet ready and renders a `fallback` UI in its place until the operation completes. A child component signals that it's not ready by throwing a Promise. Native React concepts, such as the [`use()`](https://react.dev/reference/react/use) hook, implement that convention, but so do React Router's built-in [data streaming](https://reactrouter.com/how-to/suspense) or [`<Await/>`](https://reactrouter.com/api/components/Await) patterns.

`Suspense` integrates with React's concurrent rendering model, which enables React to pause and resume rendering work without blocking the main thread. This is the foundational mechanism that enables both visual stability and responsive loading states in modern React apps.

### Loading State Fundamentals

To opt into a declarative loading state, a route loader returns a Promise without awaiting it. React Router exposes this unresolved Promise via the route's loader data, which is then passed downstream for resolution in the component tree. A `Suspense` boundary renders the fallback until that Promise settles. Critical data is awaited in the loader and available immediately. Only non-critical data is deferred to a declarative loading state.

```jsx
// route.tsx
export async function loader() {
  const critical = await fetchCriticalData();
  const nonCritical = fetchNonCriticalData(); // intentionally not awaited
  return { critical, nonCritical };
}

export default function MyRoute() {
  const {critical, nonCritical} = useLoaderData();
  return (
    <Suspense fallback={<Skeleton />}>
      {/* ... */}
    </Suspense>
  );
}
```

### The use() and Suspense Pattern

React 19 introduced the `use()` hook, which reads a Promise directly inside a component. When the Promise isn't yet settled, `use()` suspends the component, triggering the nearest `Suspense` boundary without requiring any additional abstraction.

```jsx
function NonCriticalContent({ promise }) {
  const data = use(promise);
  return <div>{data}</div>;
}

<Suspense fallback={<Skeleton />}>
  <NonCriticalContent promise={nonCritical} />
</Suspense>
```

> [!NOTE]
> While `use()` is portable and framework-agnostic, it has two relevant limitations in this context: it requires the consuming logic to be extracted into a separate component, and provides no built-in mechanism for co-locating error handling with the loading boundary.

### The Await and Suspense Pattern

React Router's `Await` component addresses both limitations. It resolves the Promise inline via a render prop, eliminating the need for a separate component, and accepts an optional `errorElement` prop that catches rejections locally, keeping the loading and error boundary co-located with the async operation. For these reasons, `Await` is the recommended pattern when working within React Router's data layer.

```jsx
<Suspense fallback={<Skeleton />}>
  <Await resolve={nonCritical}>
    {(resolved) => <NonCriticalContent data={resolved} />}
  </Await>
</Suspense>
```

When a Promise passed to `Await` rejects, the error propagates to the nearest error boundary in the tree. For more granular control, `Await` accepts an optional `errorElement` prop that catches rejections locally without affecting the rest of the route.

```jsx
<Suspense fallback={<Skeleton />}>
  <Await
    resolve={nonCritical}
    errorElement={<ErrorFallback />}>
    {(resolved) => <NonCriticalContent data={resolved} />}
  </Await>
</Suspense>
```

### Suspense Boundary Granularity

Multiple independent [`<Suspense>`](https://react.dev/reference/react/Suspense) boundaries can coexist within a single route, each encapsulating one async operation. Conceptually, each `<Suspense>` boundary acts like a `try/catch` for async. Everything inside the boundary is treated as a single loading unit, and content outside the boundary isn't affected by the suspensions within it.

This is why each promise **must** be wrapped in its own [`<Suspense>`](https://react.dev/reference/react/Suspense) boundary when a component consumes multiple asynchronous data sources. This applies to React Router's `<Await>`, React's `use()`, and any other suspending mechanism. If multiple promises share a single boundary, the faster promise resolves first and triggers a re-render. The still-pending slower promise then suspends the boundary again. Already-rendered content is torn down, and the fallback reappears. The result is visible content flicker and [layout shift](https://web.dev/articles/cls), which inflates interactivity metrics like [Interaction to Next Paint](https://web.dev/articles/inp) (INP).

With separate boundaries, each promise resolves independently. Fast content streams in and stays visible. Slower content continues loading with its own skeleton. For more details, see the React 18 architecture discussion on GitHub: [New Suspense SSR Architecture in React 18](https://github.com/reactwg/react-18/discussions/37).

#### Correct: each Await has its own Suspense boundary

```jsx
<>
  <Suspense fallback={<SkeletonA />}>
    <Await resolve={promiseA}>
      {(resolved) => <ComponentA data={resolved} />}
    </Await>
  </Suspense>

  <Suspense fallback={<SkeletonB />}>
    <Await resolve={promiseB}>
      {(resolved) => <ComponentB data={resolved} />}
    </Await>
  </Suspense>
</>
```

#### Correct: use() wrapper components, each behind its own Suspense

```jsx
function ProductWrapper({ promise }: { promise: Promise<Product> }) {
  const product = use(promise);
  return <ProductContent product={product} />;
}

function ReviewsWrapper({ promise }: { promise: Promise<Reviews> }) {
  const reviews = use(promise);
  return <ReviewsSection reviews={reviews} />;
}

<div>
  <Suspense fallback={<ProductSkeleton />}>
    <ProductWrapper promise={productPromise} />
  </Suspense>
  <Suspense fallback={<ReviewsSkeleton />}>
    <ReviewsWrapper promise={reviewsPromise} />
  </Suspense>
</div>
```

#### Anti-pattern: multiple promises sharing one boundary

```jsx
// ❌ BAD: Both Await children share a single Suspense boundary.
// When promise1 resolves first, Component1 renders briefly, then
// promise2 (still pending) suspends the boundary again — tearing
// down Component1 and showing <ComponentsSkeleton /> a second time.
<Suspense fallback={<ComponentsSkeleton />}>
  <div>
    <Await resolve={promise1}>
      {(resolved) => <Component1 resolved={resolved} />}
    </Await>
    <Await resolve={promise2}>
      {(resolved) => <Component2 resolved={resolved} />}
    </Await>
  </div>
</Suspense>
```

#### Anti-pattern: multiple use() calls in one component

```jsx
// ❌ BAD: Both use() calls suspend within the same component,
// which means they share the nearest parent Suspense boundary.
// Resolution of one promise triggers a re-render that re-suspends
// for the other, causing the same fallback thrashing.
function CombinedView({
  promise1,
  promise2,
}: {
  promise1: Promise<Component1Data>;
  promise2: Promise<Component2Data>;
}) {
  const data1 = use(promise1);
  const data2 = use(promise2);
  return (
    <>
      <Component1 resolved={data1} />
      <Component2 resolved={data2} />
    </>
  );
}

<Suspense fallback={<ComponentsSkeleton />}>
  <CombinedView promise1={promise1} promise2={promise2} />
</Suspense>
```

#### Anti-pattern: nested Await inside one boundary

```jsx
// ❌ BAD: promise2 cannot even begin to resolve until promise1 is done,
// creating an artificial waterfall on top of the shared-boundary problem.
<Suspense fallback={<ComponentsSkeleton />}>
  <Await resolve={promise1}>
    {(resolved1) => (
      <>
        <Component1 resolved={resolved1} />
        <Await resolve={promise2}>
          {(resolved2) => <Component2 resolved={resolved2} />}
        </Await>
      </>
    )}
  </Await>
</Suspense>
```

> [!TIP]
> **Exception:** Truly dependent promises (for example, fetching details after a list) can share a boundary because they represent one logical loading unit.

### Promise Identity

A [`<Suspense>`](https://react.dev/reference/react/Suspense#reference) boundary identifies a pending promise by its reference, not by its value. When a child suspends, the boundary remembers *that exact promise object* and waits for it to settle. On the next render, if the child hands back a different promise object — even one that resolves to the same data — the boundary treats it as new pending work, throws away what it just rendered, and shows the fallback again. With a fresh promise on every render, the cycle never ends and the fallback flickers forever. This applies equally to React's [`use()`](https://react.dev/reference/react/use#reference) and React Router's [`<Await>`](https://reactrouter.com/api/components/Await).

So the rule is: *the same logical operation must produce the same promise object across renders*.

Promises returned from a route `loader` satisfy this automatically — React Router preserves their identity for the lifetime of the active route match, whether read via `useLoaderData`, `useRouteLoaderData`, or `useOutletContext`. Anything composed in the component body with `Promise.all`, `Promise.race`, `.then(...)`, or any wrapper expression does not: the expression is evaluated on every render, producing a brand-new Promise object each time.

#### Anti-pattern: composing promises in the component

```jsx
// ❌ BAD: Promise.all returns a new promise every render, even with stable inputs.
// The Suspense boundary never sees the resolved reference and flickers forever.
function CombinedView() {
  const { promise1, promise2 } = useLoaderData();
  const combined = Promise.all([promise1, promise2]);
  return (
    <Suspense fallback={<Skeleton />}>
      <Await resolve={combined}>
        {([a, b]) => <Content a={a} b={b} />}
      </Await>
    </Suspense>
  );
}
```

`useMemo(() => Promise.all([p1, p2]), [p1, p2])` does **not** fix this: React discards the memo cache when the component suspends on initial mount (see [`useMemo` Caveats](https://react.dev/reference/react/useMemo#caveats), *"a state variable or a ref may be more appropriate"*; failure mode confirmed in [remix-run/remix#7392](https://github.com/remix-run/remix/issues/7392)).

#### Fix 1 — primary: compose in the loader

If the promises form one logical loading unit, combine them in the loader so `loaderData` exposes a single stable reference.

```jsx
// route.tsx
export async function loader() {
  const critical = await fetchCritical();
  // Created once per request; loaderData preserves identity across renders.
  const combined = Promise.all([fetchA(), fetchB()]);
  return { critical, combined };
}

function CombinedView() {
  const { combined } = useLoaderData();
  return (
    <Suspense fallback={<Skeleton />}>
      <Await resolve={combined}>
        {([a, b]) => <Content a={a} b={b} />}
      </Await>
    </Suspense>
  );
}
```

#### Fix 2 — primary: split into sibling boundaries

If the promises don't truly form one loading unit, give each its own `<Suspense>` boundary so they resolve independently (see [Suspense Boundary Granularity](#suspense-boundary-granularity)). No composition needed.

```jsx
function CombinedView({ p1, p2 }) {
  return (
    <>
      <Suspense fallback={<SkeletonA />}>
        <Await resolve={p1}>{(a) => <SectionA data={a} />}</Await>
      </Suspense>
      <Suspense fallback={<SkeletonB />}>
        <Await resolve={p2}>{(b) => <SectionB data={b} />}</Await>
      </Suspense>
    </>
  );
}
```

#### Fix 3 — escape hatch: pin the composed promise locally

Use only when neither primary fix applies (e.g. the inputs arrive from a parent layout's `useOutletContext`, props, or fetcher hooks, and the consuming component must combine them). The examples assume `p1` and `p2` are already stable references; how they're obtained doesn't matter.

**Variant A — lazy `useState` pin.** Frozen for the component's lifetime; invalidate by remounting via `<Component key={inputIdentity} />`.

```jsx
function CombinedView({ p1, p2 }) {
  // Lazy initializer runs once per component lifetime and survives Suspense throws.
  const [combined] = useState(() => Promise.all([p1, p2]));
  return (
    <Suspense fallback={<Skeleton />}>
      <Await resolve={combined}>{…}</Await>
    </Suspense>
  );
}
```

**Variant B — `useRef` pin with manual re-pin.** Use when the consumer can't be remounted via `key` (e.g. inputs change on revalidation while the component stays mounted). Re-pins when input identity changes; survives Suspense throws.

```jsx
function CombinedView({ p1, p2 }) {
  const pinRef = useRef(null);
  if (pinRef.current === null || pinRef.current.inputs[0] !== p1 || pinRef.current.inputs[1] !== p2) {
    pinRef.current = { inputs: [p1, p2], combined: Promise.all([p1, p2]) };
  }
  return (
    <Suspense fallback={<Skeleton />}>
      <Await resolve={pinRef.current.combined}>{…}</Await>
    </Suspense>
  );
}
```

> [!NOTE]
> The same rule applies to `use()` wrappers: a child that calls `use(somePromise)` must receive a stable promise reference as a prop. Constructing the promise in the parent's render (e.g. `<Child promise={Promise.all([a, b])} />`, `<Child promise={a.then(transform)} />`) re-suspends on every render for the same reason.

## Imperative Loading States

Imperative loading states aren't defined structurally in the component tree but are read programmatically via hooks. Rather than triggering a `Suspense` boundary, these hooks expose the current state of an async operation as a discrete value that the component consumes conditionally. This makes them the appropriate choice for scenarios where a `Suspense` boundary is either unavailable or insufficient, such as global navigation feedback, out-of-band mutations, or manual revalidation. For details on how these hooks relate to the broader state model, see [State Management](README-STATE.md).

### Summary

| Hook                                                                   | Scope                     | State property        | Triggers navigation |
|------------------------------------------------------------------------|---------------------------|-----------------------|---------------------|
| [`useNavigation()`](https://reactrouter.com/api/hooks/useNavigation)   | global / route transition | `navigation.state`    | no (reads state)    |
| [`useFetcher()`](https://reactrouter.com/api/hooks/useFetcher)         | component-level           | `fetcher.state`       | no                  |
| [`useFetchers()`](https://reactrouter.com/api/hooks/useFetchers)       | global (all active)       | `fetchers[].state`    | no                  |
| [`useRevalidator()`](https://reactrouter.com/api/hooks/useRevalidator) | current route             | `revalidator.state`   | no                  |
| [`useSubmit()`](https://reactrouter.com/api/hooks/useSubmit)           | component-level           | via `useNavigation()` | yes                 |

### The useNavigation() Hook

[`useNavigation()`](https://reactrouter.com/api/hooks/useNavigation) reflects the state of the current route transition. It covers the full navigation lifecycle, from when a transition is initiated until the destination route has fully loaded. `useNavigation()` is typically consumed in a root or layout component to provide a global loading indicator that covers all route transitions uniformly.

```jsx
const navigation = useNavigation();

return (
  <>
    {navigation.state === "loading" && <GlobalSpinner />}
    <Outlet />
  </>
);
```

`navigation.state` exposes three values:

- `idle` — no navigation in progress
- `loading` — a route transition is in progress and its loader is running
- `submitting` — a form submission or action is in progress

### The useFetcher() Hook

[`useFetcher()`](https://reactrouter.com/api/hooks/useFetcher) enables data fetching and action submissions outside of route transitions, without triggering a navigation. It's the appropriate mechanism for out-of-band operations such as inline mutations, background data refreshes, or optimistic UI updates. Unlike `useNavigation()`, `useFetcher()` is scoped to the specific operation it initiates, making it suitable for granular, component-level loading feedback.

```jsx
const fetcher = useFetcher();

return (
  <fetcher.Form method="post" action="/api/update">
    <button type="submit">
      {fetcher.state === "submitting" ? "Saving..." : "Save"}
    </button>
  </fetcher.Form>
);
```

`fetcher.state` mirrors `useNavigation().state` in structure:

- `idle` — no operation in progress
- `loading` — fetching data from a loader
- `submitting` — submitting to an action

### The useFetchers() Hook

[`useFetchers()`](https://reactrouter.com/api/hooks/useFetchers) returns an array of all in-flight fetchers across the application. While `useFetcher()` is scoped to a single component, `useFetchers()` provides a global view of all active fetcher operations. This is useful for aggregate loading indicators. For example, showing a single "saving" badge when any background mutation is in progress.

```jsx
import { useFetchers } from 'react-router';

function GlobalSavingIndicator() {
  const fetchers = useFetchers();
  const isSaving = fetchers.some(f => f.state !== 'idle');

  if (!isSaving) {
    return null;
  }
  return (
    <div className="saving-indicator">Saving…</div>
  );
}
```

Each entry in the array mirrors the shape of a single `useFetcher()` instance, exposing `state`, `formData`, `data`, and other properties. The mirroring enables patterns, such as counting active operations or building optimistic lists from multiple concurrent mutations.

### The useRevalidator() Hook

[`useRevalidator()`](https://reactrouter.com/api/hooks/useRevalidator) manually triggers revalidation of the current route's loader data, outside the standard navigation lifecycle. It's relevant when external events invalidate the current data and a reload is required without a full navigation.

```jsx
const revalidator = useRevalidator();

return (
  <button
    onClick={() => revalidator.revalidate()}
    disabled={revalidator.state === "loading"}>
    {revalidator.state === "loading" ? "Refreshing..." : "Refresh"}
  </button>
);
```

`revalidator.state` exposes two values:

- `idle` — no revalidation in progress
- `loading` — revalidation is running

### The useSubmit() Hook

[`useSubmit()`](https://reactrouter.com/api/hooks/useSubmit) programmatically triggers form submissions or action calls without requiring a `<Form>` element. It doesn't expose its own state. The resulting async operation is reflected in `useNavigation().state`, which transitions to `submitting` for the duration of the action. Because `useSubmit()` delegates state to `useNavigation()`, it's typically paired with it explicitly when loading feedback is required.

```jsx
const submit = useSubmit();
const navigation = useNavigation();

return (
  <button
    onClick={() => submit({ key: "value" }, { method: "post", action: "/api/update" })}
    disabled={navigation.state === "submitting"}>
    {navigation.state === "submitting" ? "Submitting..." : "Submit"}
  </button>
);
```

## Visual Feedback Patterns

Visual feedback patterns determine how loading states are communicated to the user. The goal is twofold: signal that an operation is in progress, and maintain visual stability so that the UI doesn't shift unexpectedly when content resolves. The appropriate pattern depends on the scope of the operation and the nature of the content being loaded.

### Skeleton Screens vs. Spinners

Spinners communicate that something is happening without making any assumptions about the shape of the incoming content. They're appropriate for global or indeterminate operations where the layout of the resolved content is unknown or irrelevant.

```jsx
<Suspense fallback={<Spinner />}>
  <Await resolve={promise}>
    {(resolved) => <Component data={resolved} />}
  </Await>
</Suspense>
```

Skeleton screens reserve the approximate layout of the incoming content before it resolves. This reduces perceived loading time and prevents layout shift, as the resolved content occupies space that was already allocated.

```jsx
<Suspense fallback={<CardSkeleton />}>
  <Await resolve={promise}>
    {(resolved) => <Card data={resolved} />}
  </Await>
</Suspense>
```

Skeleton screens are preferable when the shape of the resolved content is known and stable. Spinners are sufficient for transient, global, or low-visibility operations where layout continuity isn't a concern.

> [!TIP]
> Skeletons, like any other React components, are subject to client-side hydration. If skeleton structures are themselves complex, they can carry a non-trivial rendering cost. For content outside the initial viewport, this cost can outweigh the benefit: users don't perceive layout shift for content they can't yet see, and the skeleton itself contributes to the hydration workload without improving the visible experience. In these cases, a spinner or a simpler fallback is the more pragmatic choice, even when the structure of the expected content is known.

### Global vs. Local Loading Indicators

A global loading indicator communicates the state of the app as a whole, typically a progress bar or spinner in the navigation area. It's appropriate for route transitions where the entire page content is being replaced.

```jsx
// in a root or layout component
const navigation = useNavigation();

return (
  <>
    {navigation.state === "loading" && <ProgressBar />}
    <Outlet />
  </>
);
```

A local loading indicator is scoped to the specific UI region affected by the operation. It's appropriate for partial updates, such as deferred data within a route or out-of-band mutations via `useFetcher()`, where the rest of the UI remains interactive.

```jsx
const fetcher = useFetcher();

return (
  <section>
    {fetcher.state === "loading" ? <Skeleton /> : <Content data={fetcher.data} />}
  </section>
);
```

Global and local indicators aren't mutually exclusive. A route transition can warrant both a global progress indicator and local skeleton screens for individual content regions.

### Preventing Layout Shift

Layout shift occurs when content renders into a space that wasn't reserved for it, causing surrounding elements to reposition. Layout shift degrades both visual stability and user-perceived performance. It's measured by the [Cumulative Layout Shift (CLS)](https://web.dev/articles/cls) metric.

The primary mitigation is to reserve space for loading content before it resolves. Skeleton screens are the most direct approach, but explicit dimension constraints on container elements achieve the same effect when a skeleton isn't warranted.

```jsx
// reserve space via explicit dimensions
<div style={{ minHeight: "200px" }}>
  <Suspense fallback={null}>
    <Await resolve={data}>
      {(resolved) => <Component data={resolved} />}
    </Await>
  </Suspense>
</div>
```

Avoid using `fallback={null}` without reserving space. Rendering nothing during loading and then injecting content will shift the layout. If no visual fallback is desired, the container must still maintain its dimensions.

### Optimistic UI: No Loading States

Optimistic UI skips the loading state entirely by assuming that an operation will succeed and updating the UI immediately. The actual server response either confirms the update or triggers a rollback. This is the most responsive pattern available, but introduces complexity around error handling and state consistency.

Optimistic UI is appropriate when the probability of failure is low and the operation is reversible. It's not suitable for destructive or irreversible actions where a failed rollback leaves the UI in an inconsistent state.

`useFetcher()` exposes submitted form data via `fetcher.formData` before the action completes, enabling optimistic updates without external state management. For implementation patterns using `fetcher.formData` and `useOptimistic`, see [State Management](README-STATE.md#optimistic-state).
