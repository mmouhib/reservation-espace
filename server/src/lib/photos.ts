import { GridFSBucket, ObjectId } from "mongodb";
import { COL } from "@reservation/shared";
import { getDb } from "./mongo";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Only formats a browser shows as a picture: never SVG, which can carry scripts. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

export interface PhotoMetadata {
  ownerId: string;
  contentType: string;
}

async function bucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getDb(), { bucketName: COL.photos });
}

/** Stores a photo in MongoDB (GridFS) and returns its id. */
export async function savePhoto(ownerId: string, contentType: string, bytes: Buffer): Promise<string> {
  const metadata: PhotoMetadata = { ownerId, contentType };
  const upload = (await bucket()).openUploadStream(`${ownerId}`, { metadata });
  await new Promise<void>((resolve, reject) => upload.once("finish", () => resolve()).once("error", reject).end(bytes));
  return upload.id.toHexString();
}

export interface StoredPhoto {
  metadata: PhotoMetadata;
  stream: NodeJS.ReadableStream;
}

/** The photo, or null when the id is not a stored photo. */
export async function openPhoto(id: string): Promise<StoredPhoto | null> {
  if (!/^[0-9a-f]{24}$/.test(id)) return null;
  const file = (await (await getDb()).collection<{ metadata?: PhotoMetadata }>(`${COL.photos}.files`).findOne({ _id: new ObjectId(id) })) ?? null;
  if (!file?.metadata) return null;
  return { metadata: file.metadata, stream: (await bucket()).openDownloadStream(new ObjectId(id)) };
}

/** The owner of each of these photos, by id (ids that are not stored photos are left out). */
export async function photoOwners(ids: string[]): Promise<Map<string, string>> {
  const db = await getDb();
  const files = await db
    .collection<{ _id: ObjectId; metadata?: PhotoMetadata }>(`${COL.photos}.files`)
    .find({ _id: { $in: ids.filter((id) => /^[0-9a-f]{24}$/.test(id)).map((id) => new ObjectId(id)) } })
    .toArray();
  return new Map(files.flatMap((file) => (file.metadata ? [[file._id.toHexString(), file.metadata.ownerId] as const] : [])));
}

/** Deletes every photo a person uploaded (when their account is removed). */
export async function deletePhotosOf(ownerId: string): Promise<void> {
  const db = await getDb();
  const photos = await bucket();
  const files = await db.collection<{ _id: ObjectId }>(`${COL.photos}.files`).find({ "metadata.ownerId": ownerId }, { projection: { _id: 1 } }).toArray();
  for (const file of files) await photos.delete(file._id);
}
