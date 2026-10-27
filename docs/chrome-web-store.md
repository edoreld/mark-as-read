# Chrome Web Store

Text to paste into the [developer dashboard](https://chrome.google.com/webstore/devconsole), and the steps for publishing a release.

## Release checklist

1. Bump `version` in `markasread/manifest.json`. The store rejects a version it has already seen.
2. `npm run check` (lint and tests must pass).
3. Load the `markasread` folder unpacked in Chrome and smoke-test:
   - marking and unmarking with the icon and with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>;
   - a marked page stays marked after navigating away and back, and after restarting Chrome;
   - `page#section` and `page?utm_source=x` show as marked when `page` is;
   - options page: export, import the exported file, clear (cancel once, confirm once);
   - no errors under **Inspect views: service worker**.
4. `npm run zip` and upload `dist/mark-as-read-<version>.zip` under **Package**.
5. Update the listing text below if features changed, then **Submit for review**.
6. Tag the release: `git tag v<version> && git push --tags`.

## Store listing

**Summary** (132 characters max)

> Tick off web pages like items in a todo list. One click marks a page as read, and the icon remembers it next time you visit.

**Description**

> Imagine every website was an item in a todo list. Mark As Read lets you tick those items off.
>
> Click the toolbar icon (or press Ctrl+Shift+Z) to mark the page you're on as read. Next time you open it, the checked icon tells you you've already been there. Click again to unmark it.
>
> Great for apartment and job listings, documentation, reading lists, research, or anything where you go through many pages and want to remember which ones you've already seen.
>
> • Variants of the same page count as one: links with #sections or tracking tags like utm_source are recognized as the page you already marked.
> • Built-in rules for popular sites like YouTube, Amazon, Reddit and X.
> • Export and import your marked pages as a backup.
> • Everything stays in your browser. No account, no tracking, nothing is sent anywhere.

**Category:** Productivity

## Privacy practices

**Single purpose**

> Lets the user mark web pages as read and shows, through the toolbar icon, whether the current page has been marked.

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `tabs` | Reads the URL of the current tab to check whether it has been marked as read and to show the right toolbar icon when tabs are switched or navigate. |
| `storage` | Saves the list of pages the user marked as read, and the user's settings, locally in the browser. |
| `unlimitedStorage` | Users can mark thousands of pages; this keeps their list from hitting the default local storage quota and silently losing data. |

**Remote code:** No, I am not using remote code.

**Data usage**

- Data collected: **Web history**, only the addresses of pages the user explicitly marks as read. It is stored locally with `chrome.storage.local` and never transmitted.
- Certify all three: not sold to third parties; not used for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending.

**Privacy policy** (if the dashboard requires a URL, link to this section)

> Mark As Read stores the addresses of the pages you mark as read, and your settings, only in your browser's local extension storage. It does not collect analytics, does not use remote servers, and does not send any data anywhere. Uninstalling the extension or using "Clear All Stored Data" on the options page deletes everything it stored.
