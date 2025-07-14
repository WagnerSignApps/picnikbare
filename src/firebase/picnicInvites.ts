import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './config';
import { sendPicnicInvite } from './notifications';

interface PicnicInviteResponse {
  success: boolean;
  message?: string;
  error?: any;
}

export const inviteFriendsToPicnic = async ({
  picnicId,
  hostId,
  friendIds,
  message = 'You\'ve been invited to join a picnic!',
}: {
  picnicId: string;
  hostId: string;
  friendIds: string[];
  message?: string;
}): Promise<PicnicInviteResponse> => {
  try {
    if (!picnicId || !hostId || !friendIds?.length) {
      throw new Error('Missing required fields');
    }

    // Add the invites to the picnic document
    const picnicRef = doc(db, 'picnics', picnicId);
    await updateDoc(picnicRef, {
      invitedUsers: arrayUnion(...friendIds),
      updatedAt: new Date(),
    });

    // Send notifications to each friend
    const notificationPromises = friendIds.map(friendId => 
      sendPicnicInvite({
        picnicId,
        senderId: hostId,
        recipientId: friendId,
        message,
      })
    );

    await Promise.all(notificationPromises);

    return { success: true, message: 'Invites sent successfully' };
  } catch (error) {
    console.error('Error sending picnic invites:', error);
    return { 
      success: false, 
      message: 'Failed to send invites',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const respondToPicnicInvite = async ({
  picnicId,
  userId,
  accept,
}: {
  picnicId: string;
  userId: string;
  accept: boolean;
}): Promise<PicnicInviteResponse> => {
  try {
    const picnicRef = doc(db, 'picnics', picnicId);
    const picnicDoc = await getDoc(picnicRef);

    if (!picnicDoc.exists()) {
      throw new Error('Picnic not found');
    }

    const picnicData = picnicDoc.data();
    const invitedUsers = picnicData.invitedUsers || [];

    if (!invitedUsers.includes(userId)) {
      throw new Error('User was not invited to this picnic');
    }

    if (accept) {
      // Add user to picnic participants
      await updateDoc(picnicRef, {
        participants: arrayUnion(userId),
        updatedAt: new Date(),
      });
    }

    // Remove from invited users regardless of accept/decline
    await updateDoc(picnicRef, {
      invitedUsers: invitedUsers.filter((id: string) => id !== userId),
      updatedAt: new Date(),
    });

    return { 
      success: true, 
      message: accept ? 'Successfully joined the picnic!' : 'Invite declined'
    };
  } catch (error) {
    console.error('Error responding to picnic invite:', error);
    return { 
      success: false, 
      message: 'Failed to process your response',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
