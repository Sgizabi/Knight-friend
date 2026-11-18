"""Quick checks that the knight's work is cleaned before it goes public. Run: python brain/selftest.py"""

import craft
from llm import FakeBrain

fake_drawing = FakeBrain().chat([{"role": "user", "content": "TASK: draw"}])
clean = craft.sanitize_svg(fake_drawing)
assert clean and "<script" not in clean and "onclick" not in clean, clean

nasty = ('<svg><rect width="9" height="9" fill="url(http://x)"/>'
         '<a href="http://x"><circle r="3"/></a><use href="#ok"/>'
         '<foreignObject><div>hi</div></foreignObject><circle r="2"/></svg>')
clean = craft.sanitize_svg(nasty)
assert "http" not in clean.replace("http://www.w3.org", ""), clean
assert "foreignObject" not in clean and 'href="#ok"' in clean, clean

page = craft.sanitize_html("```html\n<html><head><base href='http://x'></head><body>"
                           "<div>hello</div></body></html>\n```")
assert "Content-Security-Policy" in page and "<base" not in page, page
again = craft.sanitize_html(page)
assert again.count("Content-Security-Policy") == 1, again

assert craft.sanitize_svg("no drawing here") is None
assert craft.sanitize_svg("<svg><rect></svg>") is None  # broken markup is rejected
print("all checks passed")
