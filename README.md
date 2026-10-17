# dsh-mermaid-plus

Mermaid diagrams for [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) — rendered **on demand** by default, so a transcript full of diagrams costs nothing until you ask for one.

```sh
dsh plugin --profile <profile> add dsh-mermaid-plus
```

The installable DSH bundle is the [`bundle/`](bundle) directory (its manifest declares `dsh.bundle.patch`); this repository root holds the build and test tooling.

## Why another Mermaid plugin

Most diagram renderers draw every fence as soon as it appears. A long conversation then pays for a 3.5 MB runtime plus one layout pass per diagram, whether or not anyone looks at it. This one inverts that:

| Mode | Behaviour | Cost |
|---|---|---|
| **On demand** (default) | Source stays visible, a `Diagram` button waits in the card header | Runtime not downloaded, zero layout |
| **When visible** | Renders when the card first scrolls into view | Only for diagrams you actually see |
| **Always** | Renders on appearance | One layout per diagram |

Rendered diagrams open **fullscreen** with wheel zoom, drag-to-pan, double-click-to-fit and `Esc` to close — because a wide flowchart squeezed into the message column is unreadable.

## Features

- `mermaid`, `mermaidjs`, `mmd`, and unlabelled blocks starting with a diagram keyword.
- Every diagram type the bundled Mermaid 11.17.0 build ships: flowchart, sequence, class, state, ER, gantt, pie, mindmap, journey, timeline, quadrant, xychart, gitGraph, requirement, C4, block, packet, sankey, kanban, architecture.
- Theme-aware colours taken from the app's live `--dsw-*` tokens; a palette change re-renders only the diagrams you are looking at.
- Streaming-safe: a fence is handed to Mermaid only after its source settles.
- Cached by source + palette, so Code/Diagram switching and reopening the viewer are free.
- Parse failures keep the source visible with a one-line error.
- Unmounting restores every code block to its original position in the transcript.
- No network egress: the runtime is bundled and served from the plugin's own Host route; diagram source never leaves the machine.

## Layout

```
bundle/               the published package
  index.js            Host half: serves the vendored runtime
  client.js           Browser half: cards, modes, viewer, settings row
  vendor/             built Mermaid runtime (MIT)
build.mjs             rebuilds the vendored runtime
test/                 host route, cordis mount, jsdom behaviour, real-browser e2e
```

Full package documentation, compatibility notes and troubleshooting: [`bundle/README.md`](bundle/README.md).

## Development

```sh
npm install             # mermaid 11.17.0, esbuild, jsdom
node build.mjs          # rebuild bundle/vendor/mermaid.esm.min.mjs
node test/run.mjs       # host route + real cordis mount + jsdom browser-half suites
node test/serve-e2e.mjs # then open http://127.0.0.1:8732/ for the real-browser suite
```

## License

MIT. Bundled Mermaid is MIT — see [`bundle/vendor/mermaid.LICENSE`](bundle/vendor/mermaid.LICENSE).
