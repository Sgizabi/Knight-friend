"""The knight's hands: cleaning up what it makes, and its window onto Wikipedia."""

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", XLINK_NS)

MAX_SVG = 24_000
MAX_HTML = 20_000

# What every workshop page is allowed to do: run its own code and styles, and
# nothing else. No network, no outside images, no forms, no embedded frames.
PAGE_CSP = ("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
            "img-src data:; font-src data:; media-src data:; connect-src 'none'; "
            "form-action 'none'; base-uri 'none'; frame-src 'none'")

GUARD = (f'<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="{PAGE_CSP}">'
         '<meta name="referrer" content="no-referrer">')

BANNED_SVG_TAGS = {"script", "foreignobject", "iframe", "object", "embed", "image",
                   "audio", "video", "a", "set", "handler", "listener"}


def slugify(text, limit=40):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (slug[:limit].strip("-") or "untitled")


def _local(tag):
    return tag.rsplit("}", 1)[-1].lower()


def _bad_url(value):
    # url(#gradient) is fine; url(http://...) or url(data:...) is not.
    return re.search(r"url\(\s*['\"]?(?!#)", value, re.I) or "javascript:" in value.lower()


def sanitize_svg(text):
    """Return a safe SVG string, or None if the drawing is unusable."""
    match = re.search(r"<svg[\s\S]*?</svg>", text, re.I)
    if not match:
        return None
    source = match.group(0)
    if "<!ENTITY" in source.upper() or "<!DOCTYPE" in source.upper():
        return None
    if 'xmlns="' not in source and "xmlns='" not in source:
        source = source.replace("<svg", f'<svg xmlns="{SVG_NS}"', 1)
    try:
        root = ET.fromstring(source)
    except ET.ParseError:
        return None

    def clean(element):
        for child in list(element):
            if _local(child.tag) in BANNED_SVG_TAGS:
                element.remove(child)
                continue
            clean(child)
        for name in list(element.attrib):
            local = _local(name)
            value = element.attrib[name]
            if local.startswith("on") or (local == "href" and not value.startswith("#")) or _bad_url(value):
                del element.attrib[name]
        if _local(element.tag) == "style" and element.text:
            element.text = re.sub(r"@import[^;]*;?", "", element.text)
            element.text = re.sub(r"url\(\s*['\"]?(?!#)[^)]*\)", "none", element.text)

    clean(root)
    if not root.get("viewBox") and not (root.get("width") and root.get("height")):
        root.set("viewBox", "0 0 480 360")
    result = ET.tostring(root, encoding="unicode")
    if len(result) > MAX_SVG or len(root) == 0:
        return None
    return result


def extract_block(text, language):
    fence = re.search(rf"```{language}\s*([\s\S]*?)```", text, re.I)
    if fence:
        return fence.group(1).strip()
    fence = re.search(r"```\w*\s*([\s\S]*?)```", text)
    return fence.group(1).strip() if fence else text.strip()


def header_value(text, key):
    match = re.search(rf"^\s*{key}:\s*(.+)$", text, re.I | re.M)
    return match.group(1).strip()[:120] if match else ""


def sanitize_html(text):
    """Make a workshop page self-contained: no network, no redirects."""
    html = extract_block(text, "html")
    if "<html" not in html.lower() and "<body" not in html.lower() and "<div" not in html.lower():
        return None
    html = html.replace(GUARD, "")  # when the knight revises a page, don't stack guards
    html = re.sub(r"<meta[^>]+http-equiv\s*=\s*['\"]?refresh[^>]*>", "", html, flags=re.I)
    html = re.sub(r"<base\b[^>]*>", "", html, flags=re.I)
    guard = GUARD
    head = re.search(r"<head[^>]*>", html, re.I)
    if head:
        html = html[:head.end()] + guard + html[head.end():]
    else:
        tag = re.search(r"<html[^>]*>", html, re.I)
        if tag:
            html = html[:tag.end()] + f"<head>{guard}</head>" + html[tag.end():]
        else:
            html = f"<!DOCTYPE html><html><head>{guard}</head><body>{html}</body></html>"
    if len(html) > MAX_HTML:
        return None
    return html


# --------------------------------------------------------------------------
# Wikipedia
# --------------------------------------------------------------------------

def _user_agent():
    repo = os.environ.get("GITHUB_REPOSITORY")
    where = f"https://github.com/{repo}" if repo else "local test"
    return f"knight-keep/1.0 (autonomous hobby project; {where})"


def _get_json(url, retry=True):
    request = urllib.request.Request(url, headers={"User-Agent": _user_agent()})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as err:
        if err.code == 429 and retry:  # asked to slow down: wait politely, try once more
            time.sleep(min(float(err.headers.get("retry-after") or 10), 30))
            return _get_json(url, retry=False)
        raise


def _offline():
    """Practice runs (KNIGHT_PRACTICE) stay off the internet."""
    return bool(os.environ.get("KNIGHT_PRACTICE"))


def wiki_random():
    """A chance encounter: one random article, briefly."""
    if _offline():
        return {"title": "Practice", "extract": "A made-up article for a practice run."}
    try:
        data = _get_json("https://en.wikipedia.org/api/rest_v1/page/random/summary")
        return {"title": data.get("title", ""), "extract": (data.get("extract") or "")[:500]}
    except Exception:
        return None


def wiki_study(query):
    """Look something up properly. Returns (title, text) or None."""
    if _offline():
        return ("Practice", "A made-up article for a practice run, about " + str(query)[:60] + ".")
    try:
        params = urllib.parse.urlencode({"action": "query", "list": "search", "srsearch": query,
                                         "srlimit": 1, "format": "json"})
        hits = _get_json(f"https://en.wikipedia.org/w/api.php?{params}")["query"]["search"]
        if not hits:
            return None
        title = hits[0]["title"]
        params = urllib.parse.urlencode({"action": "query", "prop": "extracts", "explaintext": 1,
                                         "exchars": 2800, "titles": title, "format": "json"})
        pages = _get_json(f"https://en.wikipedia.org/w/api.php?{params}")["query"]["pages"]
        text = next(iter(pages.values())).get("extract", "")
        return (title, text) if text else None
    except Exception:
        return None
