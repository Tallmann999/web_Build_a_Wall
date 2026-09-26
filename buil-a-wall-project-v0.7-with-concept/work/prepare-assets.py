"""Deterministic slicing of the 11 supplied sheets. Requires Pillow, no AI redraw.
Usage: python work/prepare-assets.py [folder containing the original uploads]
Coordinates are in source pixels; originals and crop recipes are preserved.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, sys, shutil, math

ROOT = Path(__file__).resolve().parent / 'assets'
SOURCE = ROOT / 'source'
OUT = ROOT / 'sprites'
SOURCE.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)
uploads = [
    'Изображение ChatGPT 26 сент. 2026 г., 18_32_11-4.png',
    'Изображение ChatGPT 26 сент. 2026 г., 18_32_09-2.png',
    'Изображение ChatGPT 26 сент. 2026 г., 18_32_10-3.png',
    'Изображение ChatGPT 26 сент. 2026 г., 18_32_09-1.png',
    '0a166fc9-33f7-4149-acd4-a9f9c9dfbe88.png',
    '6539ed58-9025-42c4-ae82-0fe5489da8e5.png',
    '28098405-1abd-49d9-9385-d32a2e59db05.png',
    'ad4eb41d-8c4e-45b9-add8-59fe2daf0075.png',
    'b2a5b6c3-653b-4c19-b5c4-51e3cc91977e.png',
    '6a520cd9-114f-463b-af18-93a4d603d429.png',
    '64755707-637d-4b15-8a3a-8962e793d462.png',
]
if len(sys.argv) > 1:
    for i, name in enumerate(uploads):
        shutil.copy2(Path(sys.argv[1]) / name, SOURCE / f'sheet-{i+1:02}.png')
recipes = []
def add(sheet, name, box, size=320):
    recipes.append(dict(sheet=sheet, name=name, box=box, maxSize=size))
def row(sheet, names, xs, top, bottom, size=320):
    for name, left, right in zip(names.split(), xs, xs[1:]):
        add(sheet, name, [left, top, right, bottom], size)

row(1, 'builder builder-side builder-plan builder-mini titan-mini merchant engineer', [8,230,399,649,767,904,1210,1448], 73,391)
row(1, 'titan-clay titan-stone titan-armored titan-boss', [12,345,697,1016,1448],394,846,384)
row(1, 'cash coins tool-crate', [243,589,878,1132],863,1041,192)
for level, (top,bottom) in enumerate([(48,210),(221,383),(393,565),(563,741),(727,949)],1):
    for name,left,right in [('wall',98,473),('damaged',488,850),('rubble',850,1228),('cannon',1228,1448)]:
        add(2,f'{name}-{level}',[left,top,right,bottom],384 if name!='cannon' else 160)
row(2,'wall-ground wall-foundation',[31,436,842],960,1070,512)
for i in range(6):add(2,f'build-dot-{i+1}',[898+i*87,972,977+i*87,1060],96)
row(3,'townhall market forge',[12,588,992,1448],9,491,512)
row(3,'house-red house-blue house-gold bank warehouse bakery',[6,238,455,679,901,1191,1448],499,728,256)
row(3,'lamp lamp-hanging sign-tools sign-crown noticeboard fence bush-white bush-gold pine tree pine-small',[17,99,210,344,484,630,817,970,1104,1200,1331,1448],735,897,192)
# Lamps and signs include their complete bases. Low props have separate boxes.
row(3,'log rock-plant planter barrel barrel-dark crates hay shrub gate',[196,331,481,617,701,804,956,1068,1181,1448],888,976,192)
row(3,'city-ground city-path city-stone city-path-alt city-grass',[15,281,575,857,1161,1448],976,1086,384)
row(4,'landscape-day',[7,1441],7,181,1536)
row(4,'landscape-sunset',[7,1441],181,343,1536)
row(4,'landscape-castle',[7,1441],343,527,1536)
row(4,'backdrop-forest backdrop-castle backdrop-rocks',[7,489,956,1441],527,651,640)
row(4,'ground-grass ground-junction ground-stone',[7,490,957,1441],664,779,640)
add(4,'road-long',[20,784,1428,861],1536)
row(4,'tree-round tree-pine tree-small tree-tall tree-autumn tree-pine-small bush bush-flowers bush-yellow rocks rock-grass stump log-small grass-a grass-b',[15,139,245,337,430,531,606,713,819,930,1053,1134,1210,1294,1364,1448],862,998,192)
row(4,'tile-grass tile-grass-small tile-dirt tile-dirt-small tile-stone tile-stone-small tile-grass-rock',[17,267,453,670,869,1069,1288,1448],997,1086,320)
add(5,'logo',[8,5,664,551],640)
add(5,'button-play',[666,52,1103,284],480)
add(5,'button-settings-blue',[1110,88,1433,284],256)
add(5,'tutorial-art',[668,299,1239,613],512)
add(5,'pointer-hand',[1240,348,1448,637],192)
row(5,'badge-victory badge-defeat badge-finish',[14,452,849,1165],555,847,384)
row(5,'badge-warning badge-locked badge-star spinner',[14,314,618,935,1136],843,1080,256)
for name,top,bottom in [('red',703,806),('blue',815,924),('purple',934,1050)]:add(5,'ribbon-'+name,[1157,top,1448,bottom],320)
row(6,'block-grass block-dirt block-stone block-brick block-cracked',[39,319,587,860,1135,1411],39,301,256)
row(6,'block-paving block-earth prop-crate prop-barrel sandbags',[39,319,587,855,1081,1429],314,590,256)
row(6,'bush-blocky rocks-small rock-large sign-empty bench',[21,316,574,861,1070,1440],589,847,256)
row(6,'grass-large flowers planks debris cone',[29,333,628,910,1183,1429],841,1054,256)
for name,top,bottom in [('blue',57,184),('red',198,315),('green',326,449)]:add(7,'route-'+name,[27,top,587,bottom],512)
add(7,'arrow-up',[620,34,769,186],128)
add(7,'arrow-down',[620,181,769,316],128)
row(7,'arrow-left arrow-right',[579,723,871],318,451,128)
add(7,'target-glow',[811,83,1103,383],256)
add(7,'build-glow',[1096,68,1448,464],320)
row(7,'muzzle projectile impact smoke impact-dirt',[6,332,634,915,1161,1448],467,748,256)
row(7,'repair-glow heal-glow warning-glow cracks wave-banner',[6,281,572,850,1063,1448],742,1067,320)
row(8,'cash-flying cash-stack coin-stack cash-burst',[33,402,732,1027,1434],18,299,256)
row(8,'material-wood material-stone material-steel emblem-wall emblem-castle',[24,335,597,890,1152,1434],300,562,256)
row(8,'blueprint hammer wrench cannonball health',[28,360,599,859,1145,1415],562,819,256)
row(8,'repair upgrade shield burst target chest',[20,278,480,700,928,1143,1448],817,1061,256)
add(9,'shop-frame',[9,6,615,506],640)
row(9,'card-wood card-stone card-steel card-bastion card-citadel',[619,779,930,1084,1241,1438],57,383,256)
row(9,'card-small-wood card-small-stone card-small-steel card-small-bastion card-small-citadel',[616,777,935,1100,1250,1438],386,594,192)
# Cropped material glyphs, without prices or card frames.
for name,x0,x1 in [('wood',642,768),('stone',796,921),('steel',947,1078),('bastion',1104,1229),('citadel',1260,1419)]:
    add(9,'shop-material-'+name,[x0,99,x1,254],192)
add(9,'backpack-panel',[16,523,525,745],512)
row(9,'reward-coin reward-coins reward-bag reward-chest',[527,741,968,1196,1437],605,723,256)
row(9,'stat-health stat-shield stat-power',[529,815,1120,1437],721,809,320)
row(9,'sell-card locked-card selection-frame',[20,282,486,719],804,1065,256)
add(9,'shop-tabs',[715,808,1434,896],768)
add(9,'shop-tabs-icons',[714,894,1434,983],768)
row(9,'filter-all filter-wood filter-stone filter-steel filter-bastion filter-citadel',[715,813,929,1046,1173,1296,1436],982,1061,192)
add(10,'hud-money',[18,31,476,219],512)
add(10,'hud-wave',[483,39,1036,213],640)
row(10,'button-pause button-settings',[1052,1235,1433],39,220,192)
add(10,'hud-wall',[27,239,537,386],512)
add(10,'hud-city',[545,205,1026,387],512)
add(10,'hud-progress',[1028,269,1437,383],512)
row(10,'button-shop button-upgrade button-repair button-cancel button-confirm button-bag',[29,265,489,723,958,1190,1427],392,604,192)
add(10,'tutorial-bubble',[17,605,483,814],512)
add(10,'tooltip-panel',[494,603,848,784],384)
add(10,'button-green',[852,620,1205,786],384)
add(10,'button-blue',[1205,638,1430,775],256)
row(10,'panel-blue panel-gold panel-purple panel-red',[18,388,683,923,1436],808,1050,512)
row(11,'sky-day sky-sunset sky-clouds',[8,561,1111,1666],34,217,768)
row(11,'terrain-grass terrain-dirt terrain-rock',[8,561,1111,1666],220,426,768)
row(11,'terrain-flat terrain-path terrain-paving',[8,561,1111,1666],444,621,768)
row(11,'water hills',[8,831,1666],642,776,1024)
row(11,'forest skyline',[8,831,1666],785,924,1024)

# Individual boundaries where rows overlap (caps, lamp bases and tall effects).
fixes={
 'badge-defeat':[452,610,835,842], 'badge-finish':[849,612,1165,841],
 'cannon-5':[1228,749,1448,949], 'wall-4':[98,563,473,725],
 'damaged-4':[488,563,850,732], 'rubble-4':[850,608,1228,748],
 'rubble-5':[850,773,1228,949], 'wall-5':[98,730,473,949],
 'damaged-5':[488,734,850,949], 'titan-stone':[345,394,694,846],
 'lamp':[17,735,99,947], 'lamp-hanging':[99,735,199,949],
 'bush-white':[817,735,970,856], 'bush-gold':[970,735,1104,857],
 'pine':[1104,735,1200,880], 'tree':[1200,735,1331,878],
 'pine-small':[1331,735,1448,880], 'fence':[630,735,817,880],
 'noticeboard':[484,735,617,883], 'log':[196,902,331,975],
 'rock-plant':[331,902,481,975], 'cone':[1183,853,1429,1054],
 'health':[1145,578,1415,800], 'chest':[1143,800,1448,1061],
 'sign-empty':[861,589,1070,836], 'target-glow':[821,83,1096,378],
 'projectile':[369,493,634,727]
}
for r in recipes:
    if r['name'] in fixes:r['box']=fixes[r['name']]
images = {i:Image.open(SOURCE/f'sheet-{i:02}.png').convert('RGBA') for i in range(1,12)}
sprites = {}
for r in recipes:
    im = images[r['sheet']].crop(r['box'])
    # Discard near-invisible export noise, preserve antialiasing and intentional glows.
    alpha = im.getchannel('A').point(lambda a: 0 if a < 24 else a)
    im.putalpha(alpha)
    bounds = alpha.getbbox()
    if not bounds: raise ValueError('Empty sprite: '+r['name'])
    im = im.crop(bounds)
    im.thumbnail((r['maxSize'],r['maxSize']),Image.Resampling.LANCZOS)
    # A small isolated tip of the adjacent arrow occupies this corner of the sheet.
    if r['name']=='target-glow':
        ImageDraw.Draw(im).rectangle((0,im.height-42,23,im.height),fill=(0,0,0,0))
    im.save(OUT/(r['name']+'.webp'), 'WEBP', quality=88, method=4, exact=True)
    sprites[r['name']] = im
    r['trim'] = list(bounds)
    r['size'] = list(im.size)

# Runtime and reserve art are packed separately. Reserve UI (boosts, locked cards,
# alternative landscapes) is available to designers without bloating the game.
active=set('''builder builder-side builder-plan engineer titan-clay titan-stone
titan-armored titan-boss cash-stack cash-flying cannonball burst impact smoke
build-glow repair-glow target-glow arrow-right wall-foundation sky-day landscape-day
terrain-flat road-long city-path city-stone grass-a rock-grass bush-flowers tree-pine
house-red house-blue market townhall forge warehouse bakery tree lamp crates barrel
logo button-play button-pause button-bag button-green button-cancel badge-victory badge-defeat
shop-material-wood shop-material-stone shop-material-steel shop-material-bastion shop-material-citadel
build-dot-1'''.split())
active.update(f'{kind}-{level}' for kind in ['wall','damaged','rubble','cannon'] for level in range(1,6))
pages=[]; frames={}; roles=[]
for runtime in [True,False]:
    page=Image.new('RGBA',(2048,2048)); x=y=4; shelf=0
    for name,im in sorted(sprites.items(), key=lambda item:-item[1].height):
        if (name in active)!=runtime:continue
        w,h=im.size
        if x+w+4>2048:x=4;y+=shelf+8;shelf=0
        if y+h+4>2048:
            pages.append(page);roles.append(runtime)
            page=Image.new('RGBA',(2048,2048));x=y=4;shelf=0
        page.paste(im,(x,y));frames[name]={'page':len(pages),'x':x,'y':y,'w':w,'h':h,'runtime':runtime}
        x+=w+8;shelf=max(shelf,h)
    pages.append(page.crop((0,0,2048,min(2048,y+shelf+4))));roles.append(runtime)
atlas=[]
for i,im in enumerate(pages):
    name=f'atlas-{i}.webp';im.save(ROOT/name,'WEBP',quality=88,method=4,exact=True)
    atlas.append(dict(file=name,width=im.width,height=im.height,bytes=(ROOT/name).stat().st_size,runtime=roles[i]))
manifest=dict(version=1,atlases=atlas,frames=frames)
(ROOT/'atlas.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'slice-recipes.json').write_text(json.dumps(dict(uploads=uploads,sprites=recipes),ensure_ascii=False,indent=2),encoding='utf-8')
# Human-readable inventory with every crop on a neutral background.
cols=8;cellw=190;cellh=165
contact=Image.new('RGB',(cols*cellw,math.ceil(len(sprites)/cols)*cellh),'#dce4ec')
d=ImageDraw.Draw(contact)
for i,(name,im) in enumerate(sprites.items()):
    thumb=im.copy();thumb.thumbnail((178,130),Image.Resampling.LANCZOS)
    px=(i%cols)*cellw;py=(i//cols)*cellh
    contact.paste(thumb,(px+(cellw-thumb.width)//2,py+4),thumb)
    d.text((px+5,py+140),name,fill='#152338')
contact.save(ROOT/'sprite-catalog.jpg',quality=88)
print(json.dumps(dict(sprites=len(frames),atlases=len(atlas),atlasBytes=sum(p['bytes'] for p in atlas),sourceBytes=sum(p.stat().st_size for p in SOURCE.glob('*.png')))))
