Tangent is a locally focused application. However, it does access the internet for a couple of purposes:

* **Checking for Updates** – Tangent calls into an Amazon S3 instance to check for updates when it starts up.
* **Crash Reporting** (Optional) – When enabled and if Tangent crashes, Tangent will upload crash dumps to [BugSplat](https://BugSplat.com). The information found in the crashes will only be used to fix errors. Crash dumps are automatically purged after three months.