# Media Upload API Examples

## Upload Endpoint

`POST /api/upload`

Request: `multipart/form-data`

Fields:
- `file` (required)
- `folder` (required): `products | users | banners | payments`
- `relatedType` (optional)
- `relatedId` (optional)
- `relatedUserId` (optional)
- `relatedOrderId` (optional)
- `relatedProductId` (optional)
- `note` (optional)

Headers:
- `Authorization: Bearer <firebase_id_token>`

Success response:

```json
{
  "success": true,
  "media": {
    "id": "2mkJw8d9zYV6Qmn8DwF2",
    "url": "https://your-domain.com/uploads/payments/proof-1713277812345-a1b2c3d4e5f6.webp",
    "publicPath": "/uploads/payments/proof-1713277812345-a1b2c3d4e5f6.webp",
    "storagePath": "uploads/payments/proof-1713277812345-a1b2c3d4e5f6.webp",
    "fileName": "proof-1713277812345-a1b2c3d4e5f6.webp",
    "mimeType": "image/webp",
    "sizeBytes": 284331,
    "folder": "payments"
  }
}
```

Error response:

```json
{
  "error": "Invalid file extension. Allowed: jpg, jpeg, png, webp, pdf."
}
```

## Delete Endpoint

`DELETE /api/upload/:mediaId`

Headers:
- `Authorization: Bearer <firebase_id_token>`

Success response:

```json
{
  "success": true,
  "deleted": {
    "id": "2mkJw8d9zYV6Qmn8DwF2",
    "fileDeleted": true
  }
}
```
