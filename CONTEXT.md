# S3 Image Port

S3 Image Port is a control panel for managing images in a user-owned S3-compatible bucket. This glossary names the product's domain concepts without documenting implementation details.

## Language

**Stored image**:
An image object managed by S3 Image Port in the user's own S3-compatible bucket. It is identified by a storage key and may have derived metadata such as a public URL or last-modified time.
_Avoid_: Photo, file, S3 object

**Pending upload**:
A local image file the user has queued to become a stored image after optional processing and upload. It is not a stored image until the upload succeeds.
_Avoid_: Photo, pending file, upload file

**Upload queue**:
The user's current working set of pending uploads. Items can be processed, uploaded, removed, or cleared after they become stored images.
_Avoid_: File list, upload list
