#!/usr/bin/env python3
"""Check published HTML, sitemap, metadata, schema, paths and anchors using the standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
from collections import Counter
import json, xml.etree.ElementTree as ET, argparse

ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--production',action='store_true');args=parser.parse_args()
info=json.loads((ROOT/'assets/build-info.json').read_text())
site=info['site_url'].rstrip('/')
base=urlparse(site).path.rstrip('/')
errors=[]
class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.ids=[];self.links=[];self.assets=[];self.h1=0;self.canonical=[];self.title='';self.description=[];self.robots='';self.schema=[];self.in_title=False;self.in_schema=False;self.schema_text=''
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='title':self.in_title=True
        if tag=='a' and a.get('href'):self.links.append(a['href'])
        if tag in ['img','script'] and a.get('src'):self.assets.append(a['src'])
        if tag=='img':
            if 'alt' not in a:errors.append('Image without alt')
            if a.get('srcset'):self.assets.extend(x.strip().split()[0] for x in a['srcset'].split(','))
        if tag=='link':
            if a.get('rel')=='canonical':self.canonical.append(a['href'])
            if a.get('rel') in ['stylesheet','icon','apple-touch-icon','preload']:self.assets.append(a['href'])
        if tag=='meta':
            if a.get('name')=='description':self.description.append(a.get('content',''))
            if a.get('name')=='robots':self.robots=a.get('content','')
        if tag=='script' and a.get('type')=='application/ld+json':self.in_schema=True;self.schema_text=''
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='script' and self.in_schema:
            try:self.schema.append(json.loads(self.schema_text))
            except Exception as ex:errors.append('Invalid JSON-LD: '+str(ex))
            self.in_schema=False
    def handle_data(self,data):
        if self.in_title:self.title+=data
        if self.in_schema:self.schema_text+=data

pages={}
for f in ROOT.rglob('*.html'):
    if any(x.startswith('.') for x in f.relative_to(ROOT).parts):continue
    p=Page();p.feed(f.read_text());pages[f.resolve()]=p
titles=Counter(p.title for p in pages.values())
descriptions=Counter(x for p in pages.values() for x in p.description)
for f,p in pages.items():
    label=str(f.relative_to(ROOT))
    def fail(msg):errors.append(label+': '+msg)
    if p.h1!=1:fail(f'Expected one H1, got {p.h1}')
    if len(p.canonical)!=1 or not p.canonical[0].startswith(site+'/'):fail('Canonical must match configured site')
    if not p.title or titles[p.title]!=1:fail('Missing or duplicate title')
    if len(p.description)!=1 or len(p.description[0])<70 or descriptions[p.description[0]]!=1:fail('Missing, short or duplicate description')
    if len(p.ids)!=len(set(p.ids)):fail('Duplicate IDs')
    if not p.schema:fail('Missing JSON-LD')
    for u in p.links+p.assets:
        parsed=urlparse(u)
        if parsed.scheme or parsed.netloc:continue
        path=unquote(parsed.path)
        if path.startswith('/'):
            if base and not(path==base or path.startswith(base+'/')):fail('Absolute path outside deploy base: '+u);continue
            dest=ROOT/path.removeprefix(base).lstrip('/')
        else:dest=f.parent/path if path else f
        if dest.is_dir():dest=dest/'index.html'
        if not dest.exists():fail('Broken internal link/asset: '+u);continue
        if parsed.fragment and dest.suffix=='.html':
            target=pages.get(dest.resolve())
            if target and unquote(parsed.fragment) not in target.ids:fail('Missing anchor: '+u)
    if args.production and label not in ['404.html','privacy/index.html'] and 'noindex' in p.robots:fail('Production page is noindex')
tree=ET.fromstring((ROOT/'sitemap.xml').read_text());ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls=[n.text for n in tree.findall('s:url/s:loc',ns)]
expected={p.canonical[0] for f,p in pages.items() if f.name!='404.html' and f.parent.name!='privacy'}
if set(urls)!=expected or len(urls)!=len(set(urls)):errors.append('Sitemap does not exactly match public canonical pages')
if f'Sitemap: {site}/sitemap.xml' not in (ROOT/'robots.txt').read_text():errors.append('Wrong sitemap in robots.txt')
if args.production and not info['indexable']:errors.append('Build must enable INDEXABLE=true for production')
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(pages)} HTML pages, {len(urls)} sitemap URLs; metadata, JSON-LD, internal links, anchors and local assets valid.')
