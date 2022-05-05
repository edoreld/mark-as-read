# Mark as Read

Imagine every website was an item in a todo list. This extension allows you to tick those items off.

Born out of my own need to keep track of appartment listings when looking to rent a house. 

## How to Install

Get the extension [from the Chrome Web Store](https://chrome.google.com/webstore/detail/mark-as-read/hiflhkmicfagennabmnfcnnlpkmidfjj).

## How to Use

Notice the new icon on the Chrome toolbar. 

![Image of unchecked page](https://github.com/edoreld/mark-as-read/blob/master/markasread/images/notvisited.png?raw=true)

When you tick it off, the item will look like the following:  

![Image of checked page](https://github.com/edoreld/mark-as-read/blob/master/markasread/images/icon_128.png?raw=true)

The extension will remember the "tick off state" for each page you visit and will show you the right image when you come back.

If you click on the extension icon, it will change from unchecked to checked or viceversa.

## Features

- Mark pages as read
- Import & Export visited links

### Screenshots

<h4>Options</h4>

<img src="screenshots/options.png?raw=true" width="404">

## Development

1. Clone this repo.
2. Load `markedasread` directory as an unpacked extension. See [Load an Unpacked Extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked).
3. To inspect the logs, see the "Inspect Views" section for this plugin on the extensions page.
4. Some code changes require the plugin to be re-enabled. This is done through the extension toggle on the extensions page.
5. If a change is made to `manifest.json`, the plugin must be removed from the extensions page and then loaded again (step 2).