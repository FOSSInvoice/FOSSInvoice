# Installation

This page explains how to install and run FOSSInvoice on supported platforms.

## Download (End Users)

1. Visit the Releases page: [Releases](https://github.com/FOSSInvoice/FOSSInvoice/releases)
2. Choose the installer or archive for your platform:
      - Windows: `.exe` installer or portable executable
      - macOS: `.zip` file
      - Linux: no binaries published yet, go to [developer guide](developer-guide.md).
3. Install / run.


## Updating
- Replace the binary / install newer release.
- Database should be auto-migrated if needed, but check the specific release notes.

## Uninstalling
- Delete the application bundle/binary.

## Troubleshooting

| Issue | Possible Fix |
|-------|--------------|
| App fails to start on Windows | Ensure WebView2 runtime installed (Edge based). |
| Database locked | Close running instance; avoid simultaneous access. |
| Other? | Check current issues or open a new one on [GitHub](https://github.com/FOSSInvoice/fossinvoice/issues). |

## Next Steps

Continue with the [User Guide](user-guide/getting-started.md).
