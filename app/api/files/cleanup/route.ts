import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/mongodb";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { objectKey, filename, size } = await request.json();

    if (!objectKey && (!filename || !size)) {
      return NextResponse.json(
        { error: "Either objectKey or filename+size is required" },
        { status: 400 }
      );
    }

    await getDb();

    const db = await getDb();
    const fileBlobs = db.collection("file_blobs");
    const userFiles = db.collection("user_files");

    let deleteResult = null;

    // If we have objectKey, it's a confirmed file - delete from both S3 and DB
    if (objectKey) {
      // Delete from S3
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: objectKey,
          })
        );
      } catch (s3Error) {
        console.error("S3 delete error:", s3Error);
        // Continue with DB cleanup even if S3 delete fails
      }

      // Delete from database
      deleteResult = await fileBlobs.deleteOne({ objectKey });
      await userFiles.deleteMany({ objectKey });
    } else if (filename && size) {
      // This is likely an upload in progress - try to find and delete
      // First check if it exists in file_blobs
      const existingFile = await fileBlobs.findOne({
        filename,
        size,
        // Only delete if it's not linked to any users yet
      });

      if (existingFile) {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME!,
              Key: existingFile.objectKey,
            })
          );
        } catch (s3Error) {
          console.error("S3 delete error:", s3Error);
        }

        deleteResult = await fileBlobs.deleteOne({ _id: existingFile._id });
        await userFiles.deleteMany({ objectKey: existingFile.objectKey });
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deleteResult?.deletedCount || 0,
      message: "File cleanup completed"
    });

  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup file" },
      { status: 500 }
    );
  }
}
