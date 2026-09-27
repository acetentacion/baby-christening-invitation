# Maeygia Eikana A. Pojadas — Christening Invitation

A small, mobile-first invitation website with a working RSVP form. Plain HTML, CSS and
JavaScript — **no build step, no framework, no server**. Deployed on Netlify, with RSVP
submissions stored in Netlify Forms.

## The event

| | |
| --- | --- |
| Baby | Maeygia Eikana A. Pojadas |
| Ceremony | Saturday, 24 October 2026, 1:00 PM — Fatima Parish Church |
| Reception | Camp Wagi, Masao, Butuan City |
| Timezone | Asia/Manila (UTC+8) |

## Files

```
index.html          the whole page + the RSVP form
success.html        thank-you page (target of the no-JavaScript form POST)
css/styles.css      all styling
js/main.js          AJAX submit, scroll effects
invite.ics          calendar file served at /invite.ics
netlify.toml        publish dir + /invite.ics content type
```

There is nothing to install and nothing to compile. Open `index.html` in a browser and the
page renders. Only the RSVP submission needs Netlify (see below).

---

## Where to edit the event details

| What you want to change | File | Where |
| --- | --- | --- |
| Baby's name | `index.html` | `<h1 class="hero__name">` and `<title>` |
| Parents / godparents | `index.html` | the `<!-- EDIT -->` line in the hero |
| Ceremony date & time | `index.html` | `.hero__date` and the Ceremony card `<dd>` |
| Ceremony venue | `index.html` | Ceremony card `<dd>` and its Maps link |
| Reception venue | `index.html` | Reception card `<dd>` and its Maps link |
| Colours and fonts | `css/styles.css` | the `:root { }` block at the very top |
| Form questions | `index.html` | the form inside `<div class="form-wrap">` |

RSVPs stay open with no automatic deadline.

### Adding a field to the form

Add the input inside the form with a matching `name` attribute and a real `<label for>`.
Netlify picks up any input that is present in the **deployed** HTML, so no extra config is
needed. Fields must not be added by JavaScript, or they will be missing from the form
definition Netlify builds.

### Adding a page or a new section

Edit `index.html`. If you add a `.card` element, give it the `data-reveal` attribute for the
fade-in on scroll.

### Changing the colours

Everything is driven by custom properties in `:root`. The four you will touch most:

```css
--bg: #fff9f5;        /* page background */
--blush: #f6d9d6;     /* soft pink fills */
--sage: #dce6da;      /* soft green fills */
--rose: #b4574f;      /* accent, used for text and buttons */
--sage-deep: #4f6b55;/* accent, used for text and icons */
```

Note the accent colours are the *dark* variants — they are the ones readable on a light
background at normal text sizes.

---

## Deploying to Netlify

### Option A — drag and drop (fastest)

1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `baby-christening-invitation` folder onto the page.
3. You get a live URL immediately.

### Option B — from Git (recommended, keeps history)

1. Create a repository (GitHub, GitLab or Bitbucket) and push this folder to its default
   branch.
2. In Netlify: **Add new site → Import an existing project**, and pick the repository.
3. Leave the build settings as they are detected — publish directory is `.` and the build
   command is empty. `netlify.toml` already sets this.
4. In the project's **Forms** section, select **Enable form detection** if it is not already enabled.
5. Deploy (or redeploy after enabling detection). Verify that `christening-rsvp` appears in **Forms** before sharing the invitation.

**The RSVP form only appears in the dashboard after the first successful deploy**, because
Netlify builds its form definition by reading the deployed HTML.

---

## Reading the RSVPs

1. Netlify dashboard → **Forms**.
2. The form is listed as `christening-rsvp`. The dashboard shows every submission.
3. To work with them in a spreadsheet: **Form notifications → Add notification → Email**, or
   export from the submissions view.
4. Enable an email notification so replies reach an inbox as they arrive:
   **Forms → Form notifications**. You can address it to yourself and to a co-host.

Columns captured: `guest-name`, `attending` (`yes` / `no`), and `form-name`.
The `bot-field` column exists solely to catch spam; leave it empty and those submissions are
discarded automatically.

---

## How the RSVP form behaves

- The form posts to Netlify Forms, so it works with **JavaScript disabled** — the browser
  submits normally and the guest lands on `success.html`.
- With JavaScript enabled, the submission happens in the background and the guest sees a
  thank-you message in place, without a page reload.
- If a background request fails or takes over 20 seconds, the form keeps the guest's
  answers, shows an error, and enables retry. It does not automatically submit a second request.
- Local previews cannot collect RSVPs. Test submissions on the deployed Netlify site,
  and verify receipt in **Forms > christening-rsvp**, including the spam submissions view.
- Name and attending choice are validated inline; the honeypot field filters bots.
- The button is disabled while the request is in flight so nobody can double-submit.

## The calendar file

`invite.ics` is served at `/invite.ics` (and `/calendar` redirects to it). If you move the
date, update `DTSTART`, `DTEND` and `UID` in that file, keeping the `TZID=Asia/Manila` and
the UTC+8 offsets in mind. The file uses CRLF line endings, which Google Calendar and
Outlook require — if you edit it, make sure your editor does not convert them to LF.

## Accessibility and mobile notes

- Single-column layout designed for phones first; tap targets are at least 44 px.
- Form inputs are 16 px so iOS Safari does not zoom when they are focused.
- Works with a keyboard throughout, with visible focus outlines.
- Honours `prefers-reduced-motion` and `prefers-contrast`, and has a clean print stylesheet
  if anyone prints the invitation.
