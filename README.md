# Mark as Read

Imagine every website was an item in a todo list. This extension allows you to tick those items off.

Born out of my own need to keep track of appartment listings when looking to rent a house. 

## How to Install

Get the extension [from the Chrome Web Store](https://chrome.google.com/webstore/detail/mark-as-read/hiflhkmicfagennabmnfcnnlpkmidfjj).

## How to Use

Notice the new icon on the Chrome toolbar. 

![Image of unchecked page](https://github.com/edoreld/mark-as-read/blob/master/markasread/notvisited.png?raw=true)

Click it (or press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>) to tick the page off:

![Image of checked page](https://github.com/edoreld/mark-as-read/blob/master/markasread/visited.png?raw=true)

The extension remembers which pages you ticked off and shows the right icon whenever you come back. Click again to untick.

## Features

- Mark pages as read with a click or a keyboard shortcut
- Variants of the same page count as one page: `page#section`, `page?utm_source=…` and `page` are all the same
- Built-in rules for popular sites, e.g. a YouTube video opened at a timestamp is still the same video
- Import & export your marked pages as JSON
- Everything is stored locally in your browser; nothing is sent anywhere

## Options

Right-click the toolbar icon and choose **Options** to:

- **Export / Import** a backup of your marked pages. Backups from older versions can be imported too.
- **Clear** all marked pages.
- Under **Advanced options**, edit which URL parameters are ignored when comparing pages. One rule per line:

  ```
  # ignored on every site
  utm_*, fbclid
  # ignored on these sites only (and their subdomains)
  youtube.com: t, index
  x.com, twitter.com: s, t
  ```

  A trailing `*` matches any parameter with that prefix. Saving merges marked pages that become identical under the new rules, which can't be undone, so export a backup first.
