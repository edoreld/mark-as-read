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
- Under **Advanced options**, edit which URL parameters are ignored when comparing pages. One rule per line. Default options:
  ```
# Tracking parameters, ignored on every site
utm_*, fbclid, gclid, dclid, gbraid, wbraid, msclkid, yclid, twclid, igshid
mc_cid, mc_eid, _hsenc, _hsmi, mkt_tok

# Popular sites
youtube.com: t, si, pp, feature, ab_channel, index
amazon.com, amazon.co.uk, amazon.de, amazon.fr, amazon.it, amazon.es, amazon.ca, amazon.co.jp, amazon.in, amazon.com.au: ref, ref_, pf_rd_*, pd_rd_*, crid, sprefix, qid, sr, dib, dib_tag, tag, linkCode, linkId, content-id, _encoding
ebay.com, ebay.co.uk, ebay.de: _trkparms, _trksid, hash, amdata, mkcid, mkevt, mkrid, campid, toolid, customid
aliexpress.com: spm, scm, pvid, algo_pvid, algo_exp_id, gatewayAdapt, aff_fcid, aff_fsk, aff_platform, aff_trace_key, terminal_id
google.com: ei, ved, sxsrf, oq, gs_lp, gs_lcrp, sca_esv, sca_upv, uact, sclient, sourceid, client, aqs, bih, biw, iflsig, rlz
reddit.com: share_id, rdt, ref, ref_source, ref_campaign
x.com, twitter.com: s, t, ref_src, ref_url
facebook.com: mibextid, rdid, ref, fref, hc_ref, sfnsn, __cft__*, __tn__
instagram.com: igsh, img_index
linkedin.com: trk, trkInfo, trackingId, refId, lipi, midToken, midSig, trkEmail, eid, originalSubdomain
tiktok.com: is_from_webapp, sender_device, _r, _t, share_app_id, share_item_id, share_link_id
spotify.com: si, nd
medium.com: source
  ```

  A trailing `*` matches any parameter with that prefix. Saving merges marked pages that become identical under the new rules, which can't be undone, so export a backup first.
