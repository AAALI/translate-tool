# Translate Tool

A lightweight, in-browser JSON translation editor with auto-save and draft recovery. No backend, no build step — runs entirely in the browser.

## Features

- **Upload** one or more `.json` translation files via drag-and-drop or file picker
- **3-column table**: key path · source value · editable translation
- **Auto-save** every keystroke (debounced 1.5s) + every 30s periodic backup
- **Draft recovery**: restores your work after browser crash or close
- **Search** by key name or value in real-time
- **Filter** by: All / Empty / Changed / Unchanged
- **Multi-file support**: edit `arabic.json` + `english.json` in the same session
- **Download** as single `.json` or zip of all files
- **Copy to clipboard** for pasting into GitHub's web editor
- **Diff view**: before/after comparison of all changes, exportable as Markdown
- **Undo** with Ctrl+Z (50-level history)
- **Keyboard shortcuts**: Tab/Enter to navigate, Esc to cancel, Ctrl+S to force save
- **RTL support**: Arabic and other RTL text auto-detected and displayed correctly

## Usage

1. Open the app
2. Upload your `.json` translation file(s)
3. Click any cell in the **Translation** column to edit it
4. Changes auto-save to your browser's localStorage
5. Click **Download JSON** when done

If you close the browser mid-session, the next time you open the app you'll see a **Restore Draft** banner.

## Deploy to GitHub Pages

### Option A: New repo

```bash
# Create a new GitHub repo named: translate-tool
# Clone it locally, copy these files in, then:

git add .
git commit -m "Initial commit"
git push origin main
```

Then go to **Settings → Pages → Source → Deploy from branch → main → / (root)** and save.

Your app will be live at:
```
https://YOUR-USERNAME.github.io/translate-tool/
```

### Option B: Existing repo

Copy these files into the root of your repo (or a `/docs` folder), then enable GitHub Pages for that branch/folder in Settings.

### Option C: One-command deploy with `gh`

```bash
gh repo create translate-tool --public --source=. --push
# Then enable Pages in GitHub Settings UI
```

## File Structure

```
translate-tool/
├── index.html        ← entry point
├── css/
│   └── styles.css    ← all styles (no Tailwind dependency)
├── js/
│   ├── utils.js      ← JSON flatten/unflatten, download, helpers
│   ├── storage.js    ← localStorage CRUD + monitoring
│   ├── editor.js     ← inline editing, auto-save, undo
│   ├── ui.js         ← all DOM rendering
│   └── app.js        ← state management + event delegation
└── README.md
```

## localStorage Schema

```json
{
  "tae_draft": {
    "metadata": {
      "sessionId": "tae-1234567890-abc",
      "createdAt": "2026-05-07T10:30:00Z",
      "lastModifiedAt": "2026-05-07T11:45:00Z",
      "fileNames": ["arabic.json", "english.json"]
    },
    "files": {
      "arabic.json": {
        "original": {},
        "current": {},
        "hasChanges": true,
        "changeLog": []
      }
    }
  }
}
```

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Requires JavaScript enabled. No internet connection needed after initial load (except for Google Fonts).

## License

MIT
