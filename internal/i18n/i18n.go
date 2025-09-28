package i18n

import (
	"encoding/json"
	"path/filepath"
	"strings"
)

// Dict is a flat map of translation keys to localized strings.
type Dict map[string]string

// locales is filled at init() by reading embedded JSON files.
var locales = map[string]Dict{}

// Supported locales discovered from embedded files (2‑letter code derived from filename)
var Supported []string

func init() {
	entries, err := embeddedFS.ReadDir("locales")
	if err != nil {
		return
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name() // e.g. en.json
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		code := strings.TrimSuffix(name, filepath.Ext(name))
		b, err := embeddedFS.ReadFile("locales/" + name)
		if err != nil {
			continue
		}
		// Unmarshal into generic map[string]any then flatten
		var raw map[string]any
		if err := json.Unmarshal(b, &raw); err != nil {
			continue
		}
		flat := Dict{}
		flatten("", raw, flat)
		locales[code] = flat
		Supported = append(Supported, code)
	}
}

// flatten converts a nested map into dot.notation keys
func flatten(prefix string, in map[string]any, out Dict) {
	for k, v := range in {
		key := k
		if prefix != "" {
			key = prefix + "." + k
		}
		switch val := v.(type) {
		case string:
			out[key] = val
		case map[string]any:
			flatten(key, val, out)
		default:
			// ignore non-string leaves
		}
	}
}

// Normalize converts a lang like "es-ES" to a supported base code.
func Normalize(lang string) string {
	l := strings.ToLower(strings.TrimSpace(lang))
	if l == "" {
		return "en"
	}
	// take first 2 letters
	base := l
	if len(base) > 2 {
		base = base[:2]
	}
	if _, ok := locales[base]; ok {
		return base
	}
	return "en"
}

// Tr returns the translated string for key in the given language, falling back to English
// and then to the key itself if not found.
func Tr(lang, key string) string {
	base := Normalize(lang)
	if v, ok := locales[base][key]; ok {
		return v
	}
	if v, ok := locales["en"][key]; ok {
		return v
	}
	return key
}

// T returns a translator function bound to the specified language.
func T(lang string) func(string) string { return func(key string) string { return Tr(lang, key) } }
