from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, random
random.seed(42)
W,H=1080,1350
BG=(18,9,40); PUR=(116,33,237); LIME=(207,255,28); WHITE=(248,247,255); MUTED=(198,187,226)
REG='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(size,bold=False):return ImageFont.truetype(BOLD if bold else REG,size)
def text(d,xy,s,size,color=WHITE,bold=False): d.text(xy,s,font=font(size,bold),fill=color)
def bg():
 im=Image.new('RGB',(W,H));pix=im.load()
 for y in range(H):
  for x in range(W):
   a=x/W;b=y/H
   pix[x,y]=(int(14+20*a+22*b),int(7+5*a+5*b),int(34+55*a+9*b))
 d=ImageDraw.Draw(im)
 d.ellipse((710,-220,1390,460),fill=(44,13,102))
 d.ellipse((-230,890,500,1590),fill=(46,9,82))
 for i in range(35):
  x=random.randint(20,W-20);y=random.randint(110,1170)
  d.ellipse((x,y,x+3,y+3),fill=(98,60,141))
 return im,d
def logo(d):
 d.rounded_rectangle((58,48,138,130),radius=23,fill=WHITE)
 text(d,(76,43),'P',68,BG,True)
 d.polygon([(101,67),(87,91),(105,91),(96,118),(128,83),(109,83),(122,67)], fill=LIME)
 text(d,(160,60),'Promo',47,WHITE,True);text(d,(344,60),'Flash',47,LIME,True)
def cta(d,y):
 d.rounded_rectangle((60,y,1020,y+110),radius=55,fill=LIME)
 s='PRUÉBALO GRATIS  ›'; f=font(47,True); b=d.textbbox((0,0),s,font=f)
 d.text(((W-(b[2]-b[0]))/2,y+25),s,font=f,fill=BG)
 text(d,(255,y+124),'SIN TARJETA  •  SIN REGISTRO',25,MUTED,True)
def benefit(d,x,y,icon,label):
 d.rounded_rectangle((x,y,x+285,y+102),radius=23,fill=(43,24,82),outline=(82,50,135),width=3)
 text(d,(x+20,y+18),icon,48,LIME,True);text(d,(x+86,y+31),label,22,WHITE,True)
def card(d,x,y,w,h,bg_color,title,sub,accent=LIME):
 d.rounded_rectangle((x,y,x+w,y+h),radius=25,fill=bg_color,outline=(174,113,255),width=3)
 text(d,(x+25,y+22),title,32,WHITE,True)
 text(d,(x+25,y+68),sub,23,accent,True)
def jar(d,x,y,scale=1.0):
 def box(coords,c,r=0):
  pts=tuple(int(v*scale+(x if i%2==0 else y)) for i,v in enumerate(coords))
  if r:d.rounded_rectangle(pts,radius=int(r*scale),fill=c)
  else:d.rectangle(pts,fill=c)
 box((35,10,152,53),(255,218,90),12)
 box((25,51,162,198),(180,93,19),28)
 box((42,80,145,162),(250,220,151),9)
 box((60,94,129,107),(78,51,25),2)
 d.text((x+57*scale,y+110*scale),'MIEL',font=font(int(29*scale),True),fill=(68,43,13))
def phone(d):
 x,y=614,560
 d.rounded_rectangle((x,y,x+458,y+710),radius=55,fill=(7,7,20),outline=(215,203,255),width=8)
 d.rounded_rectangle((x+18,y+20,x+440,y+685),radius=37,fill=(245,239,248))
 d.rounded_rectangle((x+132,y+15,x+318,y+42),radius=16,fill=(5,5,13))
 text(d,(x+42,y+75),'Promo',35,BG,True);text(d,(x+179,y+75),'Flash',35,(118,40,227),True)
 d.rounded_rectangle((x+40,y+146,x+418,y+413),radius=25,fill=(239,208,227))
 d.ellipse((x+126,y+195,x+310,y+375),fill=(246,155,174),outline=(228,94,130),width=9)
 d.arc((x+96,y+170,x+336,y+395),200,340,fill=WHITE,width=18)
 d.rounded_rectangle((x+52,y+456,x+406,y+535),radius=28,fill=(122,34,237))
 text(d,(x+75,y+477),'CREAR PROMOS',33,WHITE,True)
 d.rounded_rectangle((x+50,y+565,x+408,y+616),radius=12,fill=(230,225,237))
 text(d,(x+118,y+577),'1 FOTO → 3',25,BG,True)
def graphic1():
 im,d=bg();logo(d)
 text(d,(65,188),'¿VENDES POR',72,WHITE,True)
 text(d,(65,277),'INSTAGRAM?',98,LIME,True)
 text(d,(65,412),'Tu producto merece',43,MUTED,True)
 text(d,(65,472),'destacar.',69,WHITE,True)
 text(d,(66,587),'Convierte una sola foto',33,WHITE)
 text(d,(66,631),'en promociones listas',33,WHITE)
 text(d,(66,675),'para publicar.',33,WHITE)
 phone(d)
 card(d,64,826,433,145,(126,24,206),'OFERTA FLASH','Diseños que venden')
 benefit(d,63,1010,'✓','Fácil de usar')
 benefit(d,375,1010,'⚡','Ahorra tiempo')
 benefit(d,686,1010,'3','Diseños al instante')
 cta(d,1160)
 im.save('marketing/assets/promoflash_facebook_1.png',optimize=True)
def graphic2():
 im,d=bg();logo(d)
 text(d,(63,185),'UNA FOTO.',90,WHITE,True)
 text(d,(63,286),'TRES PROMOCIONES.',71,LIME,True)
 text(d,(65,394),'Transforma tus productos en diseños',33,MUTED)
 text(d,(65,438),'que destacan en redes sociales.',33,MUTED)
 d.rounded_rectangle((60,540,399,949),radius=33,fill=(248,243,236))
 text(d,(98,567),'TU FOTO',42,(40,18,60),True)
 jar(d,120,670,1.1)
 text(d,(127,907),'PRODUCTO',29,(48,30,60),True)
 text(d,(434,731),'→',88,LIME,True)
 for idx,(yy,cl,tt,sub) in enumerate([(522,(107,33,206),'NUEVO','Destaca'),(673,(212,82,18),'OFERTA','¡Solo hoy!'),(824,(43,111,68),'FLASH','Publica ya')]):
  d.rounded_rectangle((557,yy,1020,yy+139),radius=25,fill=cl)
  jar(d,848,yy+6,.60)
  text(d,(575,yy+20),tt,42,WHITE,True)
  text(d,(577,yy+75),sub,29,LIME,True)
 for i,(lab,xx) in enumerate([('1  SUBE TU FOTO',65),('2  ELIGE ESTILO',399),('3  PUBLICA',739)]):
  d.rounded_rectangle((xx,999,xx+272,1083),radius=21,fill=(48,25,91));text(d,(xx+15,1020),lab,22,WHITE,True)
 cta(d,1155)
 im.save('marketing/assets/promoflash_facebook_2.png',optimize=True)
def graphic3():
 im,d=bg();logo(d)
 text(d,(62,179),'HAZ QUE TUS',76,WHITE,True)
 text(d,(62,280),'PRODUCTOS',88,LIME,True)
 text(d,(62,385),'DESTAQUEN.',80,WHITE,True)
 text(d,(64,500),'Crea promociones que llaman la',34,MUTED)
 text(d,(64,547),'atención sin saber diseñar.',34,MUTED)
 card(d,62,672,293,275,(114,32,198),'OFERTA','IMPERDIBLE')
 jar(d,113,766,.70)
 card(d,393,672,293,275,(215,78,47),'DESCUENTO','-30%')
 d.ellipse((477,782,609,891),fill=(250,201,91));text(d,(487,815),'30%',37,(80,26,30),True)
 card(d,724,672,293,275,(47,107,115),'NOVEDAD','HOY')
 d.rounded_rectangle((808,761,931,897),radius=34,fill=(218,153,91));d.ellipse((795,773,944,802),fill=(236,192,113))
 benefit(d,62,1000,'✓','No diseñes')
 benefit(d,375,1000,'⚡','Más rápido')
 benefit(d,688,1000,'3','Tres opciones')
 cta(d,1155)
 im.save('marketing/assets/promoflash_facebook_3.png',optimize=True)
Path('marketing/assets').mkdir(parents=True,exist_ok=True)
graphic1();graphic2();graphic3()
print('CREATED',[(p.name,p.stat().st_size) for p in Path('marketing/assets').glob('*.png')])
