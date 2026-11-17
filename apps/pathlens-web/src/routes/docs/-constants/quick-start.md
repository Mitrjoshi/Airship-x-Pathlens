# Quick Start

Get Pathlens connected to your website and start collecting analytics data.

Pathlens uses a lightweight tracking script. You don't need to install a JavaScript SDK or call an API to get started.

## 1. Create a project

1. Sign in to Pathlens.
2. Create a project for the website you want to track.
3. Enter the website's domain accurately (including the correct development or production address, where applicable).
4. Save the project and open its tracking setup.

Pathlens associates incoming activity with a project and checks whether the website is authorized to use its tracker. If you are testing locally, make sure the local address is configured for your project.

## 2. Add the tracking script

Copy the tracking snippet supplied by your Pathlens project setup and paste it into your site's HTML, ideally before the closing `</head>` tag.

A basic script installation follows this pattern:

```html
<head>
  <!-- Your existing head content -->
  <script
    defer
    src="YOUR_PATHLENS_TRACKER_SCRIPT_URL"
    data-project-id="YOUR_PROJECT_ID"
  ></script>
</head>
```

Replace the example values with those provided for your project. **Use the actual snippet from Pathlens when available**; the example above illustrates the structure rather than a verified production URL.

The tracker supports an optional `data-api-url` setting for environments that require an explicit ingestion endpoint. Most website owners should use the configuration provided by their Pathlens installation instead of setting endpoint URLs manually.

### Using React or a single-page application

Place the tracking script in your application's root HTML document or other application-wide script location so it is loaded once. Do not add another copy on each page or component render.

## 3. Check that tracking is working

1. Open your website in a new browser tab.
2. Open your browser's developer tools and select **Network**.
3. Reload the page and confirm the Pathlens tracking script loads successfully.
4. Interact with the website and look for tracking-related requests. The Pathlens event ingestion endpoint uses `/api/events`; the actual hostname or environment prefix may differ.
5. Return to Pathlens and check your project's available analytics views for incoming activity.

Analytics may not become visible immediately if your deployment batches or processes events asynchronously. A successful script download alone does not prove that events were accepted.

## 4. Troubleshoot common setup issues

| Problem | What to check |
| --- | --- |
| Script does not load | Verify the script URL, browser console, network response, and any content security policy (CSP). |
| Tracking requests are rejected | Check the project's configured website address and tracker authorization settings. |
| No events appear | Check for blocked requests, browser privacy extensions, incorrect project configuration, and ingestion errors. |
| Duplicate events | Confirm the tracking snippet is loaded only once. |
| Local testing does not work | Verify that your development site's address is authorized for the project. |

Pathlens validates tracking requests and authorized websites. Don't try to bypass these checks by putting private server credentials into publicly served HTML.

## 5. Explore your analytics

Once Pathlens has accepted activity from your website, explore the analytics views available for your project. Depending on the features enabled in your deployment, these may include visitor activity, interactions, heatmaps, or session replay.

For heatmaps and replay, generate real interactions on a tracked page and allow enough time for the relevant processing before checking the results.

---

**Next step:** Keep the tracker installed across your website, then check the project's analytics after your first visits and interactions.

> **Documentation note:** The exact project-creation labels, production script URL, and copyable snippet should be confirmed against the deployed Pathlens UI before publishing this guide. This guide intentionally does not invent those values or promise a custom-event API.
