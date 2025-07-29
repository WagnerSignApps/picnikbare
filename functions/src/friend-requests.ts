import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

export const sendFriendRequestNotification = onDocumentCreated("friendRequests/{requestId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }
    const friendRequest = snapshot.data();

    const { toUserId, fromUserId } = friendRequest;

    const fromUserDoc = await db.collection("users").doc(fromUserId).get();
    const fromUserData = fromUserDoc.data();

    if (!fromUserData) {
      console.log("Sender user not found");
      return;
    }

    const payload = {
      notification: {
        title: "New Friend Request",
        body: `${fromUserData.name} sent you a friend request.`,
        icon: fromUserData.photoURL || "/vite.svg",
      },
      data: {
        type: "friend_request",
        fromUserId,
      },
    };

    const toUserDoc = await db.collection("users").doc(toUserId).get();
    const toUserData = toUserDoc.data();

    if (!toUserData || !toUserData.fcmTokens) {
      console.log("Recipient user not found or has no FCM tokens");
      return;
    }

    const tokens = toUserData.fcmTokens;

    // Send notifications to all tokens.
    const response = await admin.messaging().sendToDevice(tokens, payload);
    // For each message check if there was an error.
    const tokensToRemove: string[] = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error("Failure sending notification to", tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      // Remove the invalid tokens from the user's document.
      await db.collection("users").doc(toUserId).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
    }
  });
