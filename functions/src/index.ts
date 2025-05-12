/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialisiere Firebase Admin SDK (nur einmal pro Cloud Function-Instanz)
// Dies gibt deiner Function serverseitigen Zugriff auf Firebase-Dienste
// wie Firestore
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Der Name der Collection, die deine "Trigger Email"-Extension überwacht
// ÄNDERE DAS, WENN DU EINEN ANDEREN NAMEN GEWÄHLT HAST!
const MAIL_COLLECTION = "mail";

// Die URL deiner Registrierungsseite
// PASSE DIESE URLs AN DEINE TATSÄCHLICHEN SEITEN AN!
const APP_SIGNUP_URL = "https://aido-phi.vercel.app/login";
// const APP_LOGIN_URL = "https://aido-phi.vercel.app/login"; // Removed unused variable
// Dein App-Name
const APP_NAME = "aido";

// Firestore v2 Trigger für onDocumentCreated
export const sendContactInviteEmail = onDocumentCreated(
  "users/{inviterId}/outgoingContactRequests/{requestId}",
  async (event) => {
    logger.info(`sendContactInviteEmail triggered for requestId: ${event.params.requestId}`, { eventData: event.data?.data() });

    const snapshot = event.data;
    if (!snapshot) {
      logger.log(`No data/snapshot for event requestId: ${event.params.requestId}`);
      return;
    }
    const requestData = snapshot.data();

    const inviterId = event.params.inviterId;

    if (requestData && requestData.status === "invited" && requestData.targetEmail) {
      logger.log(`Processing invite for ${requestData.targetEmail} from ${inviterId}`);
      const targetEmail = requestData.targetEmail;

      let inviterDisplayName = "Someone";
      let inviterEmail = "";

      try {
        const inviterProfileSnap = await db.collection("users").doc(inviterId).get();
        if (inviterProfileSnap.exists) {
          const inviterProfileData = inviterProfileSnap.data();
          if (inviterProfileData?.displayName) {
            inviterDisplayName = inviterProfileData.displayName;
          }
          if (inviterProfileData?.email) {
            inviterEmail = inviterProfileData.email;
          }
        } else {
          logger.warn(`Inviter profile not found for ID: ${inviterId}`);
        }
      } catch (error) {
        logger.error(`Error fetching inviter's profile (${inviterId}):`, error);
      }

      const mailSubject = `${inviterDisplayName} has invited you to join ${APP_NAME}!`;
      const mailHtml = `
<p>Hello,</p>
<p>You've been invited by <strong>${inviterDisplayName}</strong>
 (from ${inviterEmail || APP_NAME}) to join ${APP_NAME}!</p>
<p>Click the button below to sign in with Google. This will create your
 Aido profile if you're new, or simply log you in.</p>
<p style="text-align: center; margin: 20px 0;">
  <a href="${APP_SIGNUP_URL}?email=${encodeURIComponent(targetEmail)}\
&invitedBy=${encodeURIComponent(inviterId)}" style="background-color: #4285F4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
    Sign in with Google & Join ${APP_NAME}
  </a>
</p>
<p>We're excited to have you!</p>
<p>The ${APP_NAME} Team</p>
      `;
      const mailText = `
Hello,\\n
You've been invited by ${inviterDisplayName} (from ${inviterEmail || APP_NAME})
 to join ${APP_NAME}!\\n
Click the link below to sign in with Google. This will create your
 Aido profile if you're new, or simply log you in.\\n
${APP_SIGNUP_URL}?email=${encodeURIComponent(targetEmail)}\
&invitedBy=${encodeURIComponent(inviterId)}\\n
We're excited to have you!\\n
The ${APP_NAME} Team
      `;

      try {
        const mailEntry = {
          to: [targetEmail],
          message: {
            subject: mailSubject,
            text: mailText,
            html: mailHtml,
          },
        };
        await db.collection(MAIL_COLLECTION).add(mailEntry);
        logger.log(`Invitation email queued for ${targetEmail} (invited by ` +
                    `${inviterDisplayName} - ${inviterId})`, { mailDetails: mailEntry });

        // Optional: Update den Status des outgoingContactRequests-Dokuments
        // const docRef = db.doc(
        //   `users/${inviterId}/outgoingContactRequests/${event.params.requestId}`
        // );
        // await docRef.update({
        //   status: "invite_email_sent",
        //   inviteEmailQueuedAt: admin.firestore.FieldValue.serverTimestamp(),
        // });

      } catch (error) {
        logger.error(`Error queuing invitation email for ${targetEmail}:`, error);
      }
    } else {
      logger.log(`Doc not processed. Status: ${requestData?.status}, ` +
                `Email: ${requestData?.targetEmail}`, { requestId: event.params.requestId });
    }
  },
);
