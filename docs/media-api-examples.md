# Media Upload API Examples

## Upload Endpoint

`POST /api/upload`

Request: `multipart/form-data`

Fields:
- `file` (required)
- `folder` (required):
  - Public: `tools | services | blogs | partners | profiles`
  - Protected: `payment-proofs | chat-attachments`
- `relatedType` (optional)
- `relatedId` (optional)
- `relatedUserId` (optional)
- `relatedOrderId` (required for `chat-attachments`)
- `relatedProductId` (optional)
- `note` (optional)
- `replaceMediaId` (optional)

Headers:
- `Authorization: Bearer <firebase_id_token>`

Success response:

```json
{
  "success": true,
  "media": {
    "id": "2mkJw8d9zYV6Qmn8DwF2",
    "url": "https://your-domain.com/api/upload/2mkJw8d9zYV6Qmn8DwF2",
    "publicPath": "",
    "storagePath": "uploads/payment-proofs/proof-1713277812345-a1b2c3d4e5f6.webp",
    "fileName": "proof-1713277812345-a1b2c3d4e5f6.webp",
    "mimeType": "image/webp",
    "sizeBytes": 284331,
    "folder": "payment-proofs",
    "access": "protected"
  }
}
```

Error response:

```json
{
  "error": "Invalid file extension for payment-proofs. Allowed: jpg, jpeg, png, webp, pdf."
}
```

## Fetch Endpoint

`GET /api/upload/:mediaId`

- Public media: accessible directly.
- Protected media: requires either:
  - `Authorization: Bearer <firebase_id_token>` header, or
  - `?token=<firebase_id_token>` query parameter.

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