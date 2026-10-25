#!/usr/bin/env python3
"""Check offline assets, anchors, chapter navigation, and code-block fidelity."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re
ROOT=Path(__file__).resolve().parent
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__(convert_charrefs=True);self.ids=[];self.links=[];self.assets=[];self.figures=0;self.in_pre=False;self.blocks=[];self.h1=0;self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a' and 'href' in a:self.links.append(a['href'])
        if tag in ('script','img') and 'src' in a:self.assets.append(a['src'])
        if tag=='link' and 'href' in a:self.assets.append(a['href'])
        if tag=='figure':self.figures+=1
        if tag=='h1':self.h1+=1
        if tag=='pre':self.in_pre=True;self.blocks.append('')
    def handle_endtag(self,tag):
        if tag=='pre':self.in_pre=False
    def handle_data(self,data):
        if self.in_pre:self.blocks[-1]+=data
pages={p.name:Page(p.read_text()) for p in ROOT.glob('*.html')}
assert len(pages)==8
links=0;blocks=0
sources={'index.html':'START-HERE.md','foundations.html':'01-foundations.md','code-walkthrough.html':'02-code-walkthrough.md','data-security.html':'03-data-security-tests.md','operating-guide.html':'04-operating-guide.md','practice-labs.html':'05-practice-labs.md','clients-interviews.html':'06-clients-and-interviews.md','cheatsheet.html':'CHEATSHEET.md'}
for name,page in pages.items():
    assert page.h1==1,(name,'heading count')
    assert len(page.ids)==len(set(page.ids)),(name,'duplicate IDs')
    for asset in page.assets:
        assert not urlsplit(asset).scheme,('external asset',asset)
        assert (ROOT/asset).exists(),('missing asset',asset)
    for link in page.links:
        u=urlsplit(link)
        if u.scheme:continue
        target=unquote(u.path) or name
        assert target in pages,(name,'missing page',target)
        if u.fragment:assert unquote(u.fragment) in pages[target].ids,(name,'missing anchor',link)
        links+=1
    source=(ROOT.parent/sources[name]).read_text()
    expected=[]
    for m in re.finditer(r'^( *)```([^\n]*)\n([\s\S]*?)^ *```',source,re.M):
        if m[2]=='mermaid':continue
        n=len(m[1]);expected.append('\n'.join(line[n:] if line.startswith(' '*n) else line for line in m[3].rstrip('\n').split('\n')))
    assert page.blocks==expected,(name,'code changed during rendering')
    blocks+=len(expected)
print(f'PASS: {len(pages)} pages, {links} internal links/anchors, {sum(p.figures for p in pages.values())} diagrams, {blocks} source-faithful code blocks; all assets local.')
