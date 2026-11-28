# Component splitting

## Split triggers (any one is enough)

1. **Two responsibilities.** Data loading + rendering a rich view → hook/container + presentational component.
2. **Isolated state.** A block owns state the rest of the tree does not read → extract it and move the state down (state colocation). This also cuts re-renders.
3. **A named concept in JSX.** You can name the block (`FindingRow`, `RunStatusPill`) → it deserves a component.
4. **Whole-screen branches.** `if (isLoading) … if (error) … if (!data.length) …` each rendering a large block → extract `…Empty`, `…Error`, or use `loading.tsx` / `error.tsx` at route level.
5. **Repetition.** The same markup appears twice → extract once.

## Do not split when

- The pieces are always edited together and have no independent meaning.
- The only motivation is line count.
- Extraction would require passing 6+ props that are just the parent's locals — reconsider the boundary (maybe the child should own that state or read a hook).

## Container / presentational with hooks

**Bad** — one component fetches, filters, owns selection and renders:

```tsx
export function PullDetail({ pullId }: Props) {
  const { data, isLoading } = usePullReview(pullId);
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <Spinner />;
  const sorted = data!.findings.filter(/* … */).sort(/* … */);
  return (
    <div>
      <header>{/* 40 lines */}</header>
      {sorted.map((f) => <div key={f.id} onClick={() => setSelected(f.id)}>{/* 30 lines */}</div>)}
      {selected && <aside>{/* 50 lines */}</aside>}
    </div>
  );
}
```

**Good:**

```tsx
// _components/PullDetail.tsx — orchestrates
export function PullDetail({ pullId }: Props) {
  const { data, isLoading, error } = usePullReview(pullId);
  const selection = useSelectedFinding();            // PullDetail/useSelectedFinding.ts
  if (isLoading) return <PullDetailSkeleton />;
  if (error) return <PullDetailError error={error} />;
  return (
    <>
      <PullHeader pull={data.pull} />
      <FindingsList findings={activeSorted(data.findings)}  /* from ./helpers or @/lib/findings */ onSelect={selection.select} />
      {selection.id && <FindingDrawer findingId={selection.id} onClose={selection.clear} />}
    </>
  );
}
```

`FindingsList`, `PullHeader`, `FindingDrawer` are presentational: props in, JSX out, no fetching.

## Composition over configuration

Prefer `children` and slots over boolean prop explosions.

```tsx
// ❌ <Card showHeader headerTitle="…" showFooter footerAction="…" compact />
// ✅
<Card>
  <Card.Header>{t('title')}</Card.Header>
  {body}
</Card>
```

## Where the split-out pieces go

- Child used only by one parent component → `<Parent>/_components/<Child>/` (its own folder with `index.ts`).
- Child used by several components of one route → the route's `_components/`.
- Child reused by another route → `components/` (promote in the same change).
- Generic visual primitive (button, badge, toggle) → belongs to `@devdigest/ui`; check the barrel before writing a new one.
