import struct, zlib, base64
def make_png(w,h,color=(255,0,0)):
    def chunk(tag,data):
        return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
    sig=b'\x89PNG\r\n\x1a\n'
    ihdr=struct.pack('>IIBBBBB',w,h,8,2,0,0,0)
    raw=b''
    for y in range(h):
        raw+=b'\x00'+bytes(color)*w
    idat=zlib.compress(raw)
    png=sig+chunk(b'IHDR',ihdr)+chunk(b'IDAT',idat)+chunk(b'IEND',b'')
    return png
open('test.png','wb').write(make_png(20,20))
print(base64.b64encode(open('test.png','rb').read()).decode())
