"""Quick checks that the knight's work is cleaned before it goes public. Run: python brain/selftest.py"""

import craft
import life
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
# needs: spirit settles toward the middle, gains shrink near the top, nothing leaves 0-100
needs = {"rest": 50.0, "warmth": 95.0, "inspiration": 10.0, "spirit": 95.0}
life.drift(needs, 600)
assert life.SPIRIT_HOME < needs["spirit"] < 95, needs
life.change(needs, {"warmth": 10, "inspiration": -50, "rest": 10})  # 95 + 10 shrinks to +2.5
assert 95 < needs["warmth"] < 100 and needs["inspiration"] == 0 and needs["rest"] == 60, needs
assert set(life.PASTIME_KINDS) >= {"restful", "creative", "physical", "thoughtful"}
print("all checks passed")
