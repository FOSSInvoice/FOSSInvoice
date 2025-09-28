package i18n

import "embed"

//go:embed locales/*.json
var embeddedFS embed.FS
