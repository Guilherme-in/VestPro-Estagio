import os
import uuid
import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "vestpro-produtos")

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )
    return _s3_client


def is_s3_configured() -> bool:
    return bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)


async def upload_product_image(file: UploadFile) -> str:
    """Upload product image to S3 and return the public URL."""
    if not is_s3_configured():
        raise HTTPException(
            status_code=503,
            detail="Serviço de armazenamento em nuvem não configurado. Configure as credenciais AWS no arquivo .env"
        )

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou GIF.")

    ext = file.filename.split(".")[-1].lower()
    key = f"produtos/{uuid.uuid4()}.{ext}"

    try:
        content = await file.read()
        s3 = get_s3_client()
        s3.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=key,
            Body=content,
            ContentType=file.content_type,
        )
        url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
        return url
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao fazer upload: {str(e)}")


def delete_product_image(image_url: str) -> None:
    """Delete product image from S3."""
    if not is_s3_configured() or not image_url:
        return
    try:
        key = image_url.split(f"{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/")[-1]
        s3 = get_s3_client()
        s3.delete_object(Bucket=S3_BUCKET_NAME, Key=key)
    except ClientError:
        pass
