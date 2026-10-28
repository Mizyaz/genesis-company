"""The schematic and the symbol of design A, drawn with the GENESIS design library's one
symbol language (glyphs.py, SYMBOLS.md). Colors are CSS variables, so the inline SVG follows the site's theme; each role
is one <g class="sx-..."> so the page can bring them in in order.

The wiring follows the design's netlist (the LVS source of the physical-flow chain the cards show):
  port 1 - feed line - inductor - line - common node; two series transistors from the node, a shunt transistor to
  ground after each; every gate and body through its bias resistor; each branch line - inductor - feed line - port.
The symbol carries the top cell's seven pins: three RF ports, three bias pins and ground.
No designators or net names are drawn (the site writes no shortenings); the ports carry their numbers.

usage: python -I scripts/export-schematic.py <design_library folder>
  writes src/content/story/schematic.svg and src/content/story/symbol.svg
"""
import os
import re
import sys

sys.path.insert(0, sys.argv[1])
import glyphs as g  # noqa: E402

STORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "content", "story")

# Theme colors: role -> CSS variable defined by the site (one-page.css .pv-schematic).
for role in ("active", "passive", "dc", "text"):
    g.C[role] = "var(--sx-%s)" % role
g.C["surface"] = "var(--surface)"


def write(name, width, height, label, groups):
    body = "".join('<g class="sx-%s">%s</g>' % (k, "".join(v)) for k, v in groups.items() if v)
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="%s">%s</svg>' % (width, height, label, body)
    # net() writes an empty <text> for a nameless terminal; drop it, and keep the file on one line
    svg = re.sub(r"<text[^>]*></text>", "", svg.replace("\n", "")) + "\n"
    if re.search(r"#[0-9a-fA-F]{3,6}\b", svg):
        raise SystemExit("%s: a fixed color is left; every color must be a theme variable" % name)
    path = os.path.join(STORY, name)
    open(path, "w").write(svg)
    print("wrote", os.path.normpath(path), len(svg), "bytes")


def schematic():
    groups = {"wire": [], "line": [], "active": [], "passive": [], "dc": [], "port": []}
    add = lambda kind, *parts: groups[kind].extend(parts)
    yu, yl = 60, 170
    xn, ym = 186, (yu + yl) / 2

    # input path on the middle line: port 1, feed line, inductor, line to the common node
    add("wire", g.wire((22, ym), (xn, ym)), g.wire((xn, yu), (xn, yl)), g.dot(xn, ym))
    add("port", g.port(22, ym, "1", hang=False))
    add("line", g.cpw(62, ym, 24), g.cpw(150, ym, 24))
    add("passive", g.inductor_symbol(106, ym))

    def branch(y, upper):
        sgn = -1 if upper else 1
        xs, rot = 226, (90 if upper else -90)
        d, s_, gt, bg = g.transistor_terminals(xs, y, rot)
        add("active", g.transistor(xs, y, rot, body=True))
        left, right = (s_, d) if upper else (d, s_)
        add("wire", g.wire((xn, y), left))
        # series gate: resistor to its bias pin
        add("dc", g.wire(gt, (gt[0], gt[1] + 2 * sgn), color="dc"), g.resistor(gt[0], gt[1] + 2 * sgn, gt[0], gt[1] + 26 * sgn, "dc"),
            g.net(gt[0], gt[1] + 26 * sgn, "", "above"))
        # series body: resistor toward the shared back gate node
        add("dc", g.wire(bg, (bg[0], bg[1] - 5 * sgn), color="dc"), g.resistor(bg[0], bg[1] - 5 * sgn, bg[0], bg[1] - 29 * sgn, "dc"))
        # node after the series transistor, shunt transistor to ground
        xr = 318
        add("wire", g.wire(right, (xr, y)), g.dot(xr, y))
        d2, s2, g2, b2 = g.transistor_terminals(xr, y + 27, 0)
        add("wire", g.wire((xr, y), d2), g.ground(*s2))
        add("active", g.transistor(xr, y + 27, 0, body=True))
        add("dc", g.resistor(g2[0], g2[1], g2[0] - 26, g2[1], "dc"), g.net(g2[0] - 26, g2[1], "", "left"),
            g.resistor(b2[0], b2[1], b2[0] + 26, b2[1], "dc"), g.net(b2[0] + 26, b2[1], "", "right"))
        # line, inductor, feed line to the port
        xp = 482
        add("wire", g.wire((xr, y), (xp, y)))
        add("line", g.cpw(372, y, 24), g.cpw(460, y, 24))
        add("passive", g.inductor_symbol(416, y))
        add("port", g.port(xp, y, "2" if upper else "3"))
        return bg

    bu, bl = branch(yu, True), branch(yl, False)
    # the shared back gate node of the two series transistors, to its bias pin
    add("dc", g.wire((bu[0], bu[1] + 29), (bu[0], ym), (bl[0], bl[1] - 29), color="dc"), g.dot(bu[0], ym, color="dc"),
        g.wire((bu[0], ym), (bu[0] + 14, ym), color="dc"), g.net(bu[0] + 14, ym, "", "right"))
    write("schematic.svg", 516, 232, "Schematic of design A: one input, two series transistors and two shunt transistors, "
          "inductors and interconnect lines to two outputs, bias resistors on every gate and body", groups)


def symbol():
    groups = {"wire": [], "active": [], "dc": [], "port": []}
    add = lambda kind, *parts: groups[kind].extend(parts)
    x0, y0, w, h = 70, 40, 140, 120
    add("wire", g.rect(x0, y0, w, h, sw=1.6, rx=6))
    # three RF ports: 1 on the left, 2 and 3 on the right
    add("wire", g.wire((x0 - 30, y0 + h / 2), (x0, y0 + h / 2)), g.wire((x0 + w, y0 + 35), (x0 + w + 30, y0 + 35)),
        g.wire((x0 + w, y0 + h - 35), (x0 + w + 30, y0 + h - 35)))
    add("port", g.port(x0 - 40, y0 + h / 2, "1"), g.port(x0 + w + 40, y0 + 35, "2"), g.port(x0 + w + 40, y0 + h - 35, "3"))
    # inside: one transistor glyph per output
    add("active", g.block_glyph("transistor", x0 + w / 2, y0 + 35, 30, "active"), g.block_glyph("transistor", x0 + w / 2, y0 + h - 35, 30, "active"))
    # three bias pins on top, ground at the bottom
    for i in range(3):
        x = x0 + 35 + i * 35
        add("dc", g.wire((x, y0), (x, y0 - 22), color="dc"), g.net(x, y0 - 22, "", "above"))
    add("wire", g.wire((x0 + w / 2, y0 + h), (x0 + w / 2, y0 + h + 14)), g.ground(x0 + w / 2, y0 + h + 14))
    write("symbol.svg", 280, 200, "Symbol of design A: three RF ports, three bias pins and ground", groups)


schematic()
symbol()
