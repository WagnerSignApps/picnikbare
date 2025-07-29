import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const respondToPicnicInvite = onCall(async (request) => {
    const { picnicId, notificationId, accept } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to respond to an invite."
      );
    }

    const picnicRef = db.collection("picnics").doc(picnicId);
    const notificationRef = db.collection("notifications").doc(notificationId);

    const picnicDoc = await picnicRef.get();
    const notificationDoc = await notificationRef.get();

    if (!picnicDoc.exists || !notificationDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Picnic or notification not found."
      );
    }

    const picnic = picnicDoc.data();
    const notification = notificationDoc.data();

    if (notification?.recipientId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You are not authorized to respond to this invite."
      );
    }

    await notificationRef.update({ isRead: true });

    if (accept) {
      await picnicRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(uid),
      });

      // Notify the creator that the user accepted the invite
      const creatorId = picnic?.createdBy;
      if (creatorId) {
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();
        if (userData) {
          await db.collection("notifications").add({
            type: "picnic_update",
            senderId: uid,
            recipientId: creatorId,
            picnicId,
            message: `${userData.name} has accepted your picnic invite.`,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    return { success: true };
  }
);
