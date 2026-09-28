from io import BytesIO
from uuid import uuid4
from fastapi import APIRouter, UploadFile, Request, HTTPException
from PIL import Image, UnidentifiedImageError
from app.api.dependencies import Actor

router = APIRouter(prefix='/uploads', tags=['Images'])
Image.MAX_IMAGE_PIXELS = 16_000_000
@router.post('', status_code=201)
def upload(file: UploadFile, actor: Actor, request: Request):
    raw = file.file.read(5_000_001)
    if len(raw)>5_000_000: raise HTTPException(413,'Image limitée à 5 Mo.')
    try:
        with Image.open(BytesIO(raw)) as img:
            if img.format not in ('PNG','JPEG','WEBP') or img.width*img.height>16_000_000:
                raise ValueError('Format invalide')
            img.load()
            output=BytesIO()
            img.convert('RGB').save(output,format='WEBP',quality=85)
    except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError):
        raise HTTPException(422,'Image invalide.')
    key=f'{actor.id}/{uuid4()}.webp'
    path=request.app.state.config.upload_dir/key
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(output.getvalue())
    return {'key':key,'url':f'/media/{key}'}
