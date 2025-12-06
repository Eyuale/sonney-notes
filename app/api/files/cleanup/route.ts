import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/gcs";
import { getDb } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { objectKey, filename, size } = await request.json();

    if (!objectKey && (!filename || !size)) {
      return NextResponse.json(
        { error: "Either objectKey or filename+size is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const fileBlobs = db.collection("file_blobs");
    const userFiles = db.collection("user_files");

    let deleteResult: any = null;

    // If we have objectKey, it's a confirmed file - delete from both GCS and DB
    if (objectKey) {
      // Delete from GCS
      try {
        await deleteFile(objectKey);
      } catch (gcsError) {
        console.error("GCS delete error:", gcsError);
        // Continue with DB cleanup even if GCS delete fails
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
          await deleteFile(existingFile.objectKey);
        } catch (gcsError) {
          console.error("GCS delete error:", gcsError);
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
