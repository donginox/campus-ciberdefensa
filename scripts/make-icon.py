from pathlib import Path
from PIL import Image,ImageDraw
out=Path(__file__).resolve().parents[1]/'build'
im=Image.new('RGBA',(1024,1024),(0,0,0,0));d=ImageDraw.Draw(im)
d.rounded_rectangle((0,0,1023,1023),radius=224,fill='#132846')
d.polygon([(236,196),(788,196),(788,544),(760,640),(650,744),(512,846),(374,744),(264,640),(236,544)],fill='#f5f3ed')
d.polygon([(270,228),(754,228),(754,538),(730,618),(630,710),(512,802),(394,710),(294,618),(270,538)],fill='#8c3041')
d.polygon([(332,334),(472,334),(512,370),(552,334),(692,334),(692,596),(554,596),(512,622),(470,596),(332,596)],fill='#f5f3ed')
d.line([(512,370),(512,620)],fill='#132846',width=16)
for x in [370,568]:
 for y in [392,440,488]:d.line([(x,y),(x+86,y)],fill='#132846',width=18)
d.line([(434,680),(484,716),(592,622)],fill='#bc994b',width=32,joint='curve')
im.save(out/'icon.png');im.save(out/'icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Iconos PNG/ICO generados.')
